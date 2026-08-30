import type { ZodType } from 'zod'
import { API_BASE_URL } from '../config'
import type { ApiErrorBody } from '../contracts/contracts'
import { apiSuccessSchema, tokenDataSchema, type TokenData } from '../contracts/contracts'
import { toQueryString } from '../utils/queryString'
import { sessionStore } from './sessionStore'

type Method = 'GET' | 'POST' | 'PATCH'
type SessionInvalidHandler = (reason: 'expired' | 'forbidden') => void
let sessionInvalidHandler: SessionInvalidHandler | null = null
let refreshPromise: Promise<TokenData> | null = null

export function setSessionInvalidHandler(handler: SessionInvalidHandler | null) {
  sessionInvalidHandler = handler
}

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly requestId?: string,
    public readonly retryAfter?: number,
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

function requestId() {
  return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
}

async function fetchJson(path: string, method: Method, body?: unknown, accessToken?: string | null) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 10_000)
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': requestId(),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    const payload = await response.json().catch(() => null) as unknown
    if (!response.ok) {
      const error = (payload && typeof payload === 'object' ? payload : {}) as ApiErrorBody
      const retryAfterValue = response.headers.get('Retry-After')
      throw new ApiClientError(
        response.status,
        error.code || 'HTTP_ERROR',
        error.message || '请求失败，请稍后重试',
        error.requestId || response.headers.get('X-Request-Id') || undefined,
        retryAfterValue ? Number(retryAfterValue) : undefined,
      )
    }
    return payload
  } finally {
    window.clearTimeout(timeout)
  }
}

async function refreshTokens() {
  if (refreshPromise) return refreshPromise
  const refreshToken = sessionStore.getRefreshToken()
  if (!refreshToken) throw new ApiClientError(401, 'AUTH_TOKEN_INVALID', '登录已失效，请重新登录')
  refreshPromise = (async () => {
    const payload = await fetchJson('/auth/refresh', 'POST', { refreshToken })
    const parsed = apiSuccessSchema(tokenDataSchema).safeParse(payload)
    if (!parsed.success) throw new ApiClientError(0, 'CONTRACT_MISMATCH', '接口数据格式与约定不一致')
    sessionStore.setTokens(parsed.data.data.accessToken, parsed.data.data.refreshToken)
    return parsed.data.data
  })().finally(() => { refreshPromise = null })
  return refreshPromise
}

export async function apiRequest<T>(
  method: Method,
  path: string,
  schema: ZodType<T>,
  options: { body?: unknown; query?: Record<string, unknown>; anonymous?: boolean; retry401?: boolean } = {},
): Promise<T> {
  const target = `${path}${toQueryString(options.query ?? {})}`
  const execute = () => fetchJson(target, method, options.body, options.anonymous ? null : sessionStore.getAccessToken())
  let payload: unknown
  try {
    payload = await execute()
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 401 && !options.anonymous && options.retry401 !== false) {
      try {
        await refreshTokens()
        payload = await execute()
      } catch (refreshError) {
        sessionStore.clear()
        sessionInvalidHandler?.('expired')
        throw refreshError
      }
    } else if (error instanceof ApiClientError && error.status === 403) {
      sessionStore.clear()
      sessionInvalidHandler?.('forbidden')
      throw error
    } else {
      throw error
    }
  }
  const parsed = apiSuccessSchema(schema).safeParse(payload)
  if (!parsed.success) throw new ApiClientError(0, 'CONTRACT_MISMATCH', '接口数据格式与约定不一致')
  return parsed.data.data
}
