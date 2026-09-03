/**
 * 小程序与后端 REST API 的唯一通信入口。
 *
 * 该文件负责 Token 持久化、401 后的 Refresh Token 轮换、统一错误对象，以及
 * OpenAPI 已定义接口的调用；页面不可直接使用 Taro.request，也不可保留本地业务 Mock。
 */
import Taro from '@tarojs/taro'

import { shouldAttemptTokenRefresh } from '../domain/core'

const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8080/api/v1'
const API_BASE_URL = process.env.TARO_APP_API_BASE_URL || DEFAULT_API_BASE_URL
const ACCESS_TOKEN_KEY = 'ai-ganfan.access-token'
const REFRESH_TOKEN_KEY = 'ai-ganfan.refresh-token'

export type MealType = 'BREAKFAST' | 'LUNCH' | 'AFTERNOON_TEA' | 'DINNER' | 'LATE_NIGHT'
export type DietSource = 'MANUAL' | 'SLOT'
export type PreferenceKind = 'TASTE' | 'MEDICAL_ALLERGY' | 'DIETARY_RESTRICTION' | 'DISLIKE'
export type PreferenceItem = { type: 'PRESET' | 'CUSTOM'; value: string; label?: string }

export interface ApiEnvelope<T> { code: 'OK'; message: string; data: T; requestId: string; timestamp: string }
export interface ApiErrorBody { code: string; message: string; details: Array<{ field: string; reason: string }>; requestId: string; timestamp: string }
export class ApiError extends Error {
  constructor(public readonly statusCode: number, public readonly body: ApiErrorBody) { super(body.message) }
}

export interface User { id: string; email: string | null; nickname: string; avatarUrl: string | null; role: 'USER' | 'ADMIN' | 'SUPER_ADMIN'; status: 'ACTIVE' | 'DISABLED' | 'CANCELLED'; onboardingCompleted: boolean; mustChangePassword: boolean }
export interface AuthData { accessToken: string; accessTokenExpiresIn: number; refreshToken: string; refreshTokenExpiresIn: number; user: User; nextStep: 'ONBOARDING' | 'HOME' | 'ADMIN_HOME' | 'CHANGE_PASSWORD' }
export interface FoodOption { id: string; name: string; category: string; defaultPrice: string; tags: string[]; source: 'DEFAULT' | 'CUSTOM' }
export interface FoodSnapshot { foodOptionId: string; name: string; category: string | null; defaultPrice: string; tags: string[] }
export interface DietRecord { id: string; foodOptionId: string | null; foodName: string; category: string | null; tags: string[]; actualPrice: string; mealType: MealType; eatenAt: string; businessDate: string; source: DietSource; createdAt: string; updatedAt: string }
export interface PageData<T> { items: T[]; page: number; size: number; totalElements: number; totalPages: number }
/** 所有金额字段均按 API 契约使用固定两位十进制字符串。 */
export interface Preferences { budgetEnabled: boolean; dailyBudget: string | null; medicalAllergies: PreferenceItem[]; dietaryRestrictions: PreferenceItem[]; dislikes: PreferenceItem[]; tastePreferences: PreferenceItem[] }
export interface SlotSpin { spinId: string; selectedFood: FoodSnapshot; expiresAt: string }

let sessionRedirecting = false

function tokens() { return { accessToken: Taro.getStorageSync<string>(ACCESS_TOKEN_KEY), refreshToken: Taro.getStorageSync<string>(REFRESH_TOKEN_KEY) } }
function saveTokens(data: Pick<AuthData, 'accessToken' | 'refreshToken'>) { sessionRedirecting = false; Taro.setStorageSync(ACCESS_TOKEN_KEY, data.accessToken); Taro.setStorageSync(REFRESH_TOKEN_KEY, data.refreshToken) }
export function clearTokens() { Taro.removeStorageSync(ACCESS_TOKEN_KEY); Taro.removeStorageSync(REFRESH_TOKEN_KEY) }
export function isLoggedIn() { return Boolean(tokens().accessToken) }

let refreshPromise: Promise<void> | null = null

function makeUrl(path: string, query?: Record<string, string | number | boolean | undefined | string[]>) {
  const pairs: string[] = []
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === '') return
    if (Array.isArray(value)) value.forEach((item) => pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(item)}`))
    else pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
  })
  return `${API_BASE_URL}${path}${pairs.length ? `?${pairs.join('&')}` : ''}`
}

function requestFailureMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'object' && error !== null && 'errMsg' in error && typeof error.errMsg === 'string') return error.errMsg
  return '网络请求失败'
}

async function rawRequest<T>(method: Taro.request.Option['method'], path: string, data?: unknown, query?: Record<string, string | number | boolean | undefined | string[]>): Promise<ApiEnvelope<T>> {
  const { accessToken } = tokens()
  const url = makeUrl(path, query)
  // 真机联调只记录方法与地址，绝不输出 Authorization、登录 code 或请求体。
  console.info('[API] 发起请求', { method, url })
  let response: Taro.request.SuccessCallbackResult<ApiEnvelope<T> | ApiErrorBody>
  try {
    response = await Taro.request<ApiEnvelope<T> | ApiErrorBody>({ url, method, data, timeout: 5000, header: { 'content-type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) } })
  } catch (error) {
    const message = requestFailureMessage(error)
    console.error('[API] 请求未发出或网络失败', { method, url, message })
    throw new Error(message)
  }
  console.info('[API] 收到响应', { method, url, statusCode: response.statusCode })
  if (response.statusCode >= 200 && response.statusCode < 300) return response.data as ApiEnvelope<T>
  throw new ApiError(response.statusCode, response.data as ApiErrorBody)
}

async function refresh() {
  if (refreshPromise) return refreshPromise
  refreshPromise = (async () => {
    const { refreshToken } = tokens()
    if (!refreshToken) throw new ApiError(401, { code: 'AUTH_TOKEN_INVALID', message: '登录已失效，请重新登录', details: [], requestId: '', timestamp: '' })
    const response = await Taro.request<ApiEnvelope<Pick<AuthData, 'accessToken' | 'refreshToken'>>>({ url: makeUrl('/auth/refresh'), method: 'POST', data: { refreshToken }, header: { 'content-type': 'application/json' } })
    if (response.statusCode < 200 || response.statusCode >= 300) throw new ApiError(response.statusCode, response.data as unknown as ApiErrorBody)
    saveTokens(response.data.data)
  })().finally(() => { refreshPromise = null })
  return refreshPromise
}

async function redirectExpiredSession() {
  clearTokens()
  if (sessionRedirecting) return
  sessionRedirecting = true
  try {
    await Taro.reLaunch({ url: '/pages/auth/login/index?reason=sessionExpired' })
  } catch (error) {
    sessionRedirecting = false
    throw error
  }
}

async function request<T>(method: Taro.request.Option['method'], path: string, data?: unknown, query?: Record<string, string | number | boolean | undefined | string[]>): Promise<T> {
  try { return (await rawRequest<T>(method, path, data, query)).data }
  catch (error) {
    if (!(error instanceof ApiError) || !shouldAttemptTokenRefresh(path, error.statusCode)) throw error
    try { await refresh(); return (await rawRequest<T>(method, path, data, query)).data }
    catch (refreshError) {
      if (refreshError instanceof ApiError && refreshError.statusCode === 401) {
        await redirectExpiredSession()
      }
      throw refreshError
    }
  }
}

export const api = {
  register: async (email: string, password: string, confirmPassword: string) => { const data = await request<AuthData>('POST', '/auth/register', { email, password, confirmPassword }); saveTokens(data); return data },
  login: async (email: string, password: string) => { const data = await request<AuthData>('POST', '/auth/login', { email, password }); saveTokens(data); return data },
  weChatMiniProgramLogin: async (code: string) => { const data = await request<AuthData>('POST', '/auth/wechat/mini-program/login', { code }); saveTokens(data); return data },
  bindWeChatMiniProgram: async (code: string, email: string, password: string) => { const data = await request<AuthData>('POST', '/auth/wechat/mini-program/bind', { code, email, password }); saveTokens(data); return data },
  logout: async () => { const { refreshToken } = tokens(); try { if (refreshToken) await request<Record<string, never>>('POST', '/auth/logout', { refreshToken }) } finally { clearTokens() } },
  me: () => request<User>('GET', '/users/me'),
  submitOnboarding: (data: { nickname: string | null; budgetEnabled: boolean; dailyBudget: string | null; medicalAllergies: PreferenceItem[]; dietaryRestrictions: PreferenceItem[]; dislikes: PreferenceItem[]; tastePreferences: PreferenceItem[] }) => request<User>('PUT', '/users/me/onboarding', data),
  updateProfile: (nickname: string) => request<User>('PATCH', '/users/me/profile', { nickname }),
  changePassword: (currentPassword: string, newPassword: string, confirmNewPassword: string) => request<Record<string, never>>('POST', '/users/me/change-password', { currentPassword, newPassword, confirmNewPassword }),
  cancelAccount: (currentPassword: string) => request<Record<string, never>>('POST', '/users/me/cancel', { currentPassword, confirmation: 'CANCEL' }),
  preferenceOptions: () => request<Record<PreferenceKind, PreferenceItem[]>>('GET', '/preferences/options'),
  preferences: () => request<Preferences>('GET', '/users/me/preferences'),
  updatePreferences: (data: Partial<Preferences>) => request<Preferences>('PATCH', '/users/me/preferences', data),
  foods: (query?: { page?: number; size?: number; keyword?: string; category?: string; tags?: string[] }) => request<PageData<FoodOption>>('GET', '/food-options', undefined, query),
  food: (id: string) => request<FoodOption>('GET', `/food-options/${id}`),
  createFood: (data: Omit<FoodOption, 'id' | 'source'>) => request<FoodOption>('POST', '/food-options', data),
  updateFood: (id: string, data: Partial<Omit<FoodOption, 'id' | 'source'>>) => request<FoodOption>('PATCH', `/food-options/${id}`, data),
  deleteFood: (id: string) => request<undefined>('DELETE', `/food-options/${id}`),
  createSpin: (previousSpinId?: string) => request<SlotSpin>('POST', '/slot/spins', previousSpinId ? { previousSpinId } : {}),
  confirmSpin: (id: string, data: { actualPrice: string; mealType: MealType; eatenAt: string }) => request<DietRecord>('POST', `/slot/spins/${id}/confirm`, data),
  records: (query?: { page?: number; size?: number; startDate?: string; endDate?: string; mealType?: MealType; category?: string; source?: DietSource }) => request<PageData<DietRecord>>('GET', '/diet-records', undefined, query),
  createRecord: (data: { actualPrice: string; mealType: MealType; eatenAt: string; foodOptionId?: string; manualFood?: { name: string; category: string; tags: string[] }; addToFoodPool?: boolean }) => request<DietRecord>('POST', '/diet-records', data),
  updateRecord: (id: string, data: Partial<{ actualPrice: string; mealType: MealType; eatenAt: string; foodOptionId: string; manualFood: { name: string; category: string; tags: string[] } }>) => request<DietRecord>('PATCH', `/diet-records/${id}`, data),
  deleteRecord: (id: string) => request<undefined>('DELETE', `/diet-records/${id}`),
  statistics: (startDate: string, endDate: string, groupBy: 'DAY' | 'MONTH' | 'YEAR') => request<{ totalSpent: string; recordCount: number; recordedDays: number; averageDailySpent: string; spendingSeries: Array<{ period: string; totalSpent: string }>; categoryDistribution: Array<{ category: string; totalSpent: string; recordCount: number }> }>('GET', '/diet-records/statistics', undefined, { startDate, endDate, groupBy }),
}
