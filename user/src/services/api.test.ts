import { beforeEach, describe, expect, it, vi } from 'vitest'

import { api } from './api'

const taroMocks = vi.hoisted(() => {
  const storage = new Map<string, string>()
  return {
    storage,
    request: vi.fn(),
    reLaunch: vi.fn().mockResolvedValue(undefined),
    setStorageSync: vi.fn((key: string, value: string) => storage.set(key, value)),
    getStorageSync: vi.fn((key: string) => storage.get(key) ?? ''),
    removeStorageSync: vi.fn((key: string) => storage.delete(key)),
  }
})

vi.mock('@tarojs/taro', () => ({
  default: {
    request: taroMocks.request,
    reLaunch: taroMocks.reLaunch,
    setStorageSync: taroMocks.setStorageSync,
    getStorageSync: taroMocks.getStorageSync,
    removeStorageSync: taroMocks.removeStorageSync,
  },
}))

const unauthorized = (code: string, message: string) => ({
  statusCode: 401,
  data: { code, message, details: [], requestId: 'request-1', timestamp: '2026-08-19T00:00:00Z' },
})

describe('API 401 handling', () => {
  it('never sends a WeChat login without explicit current consent', async () => {
    taroMocks.request.mockReset()
    await expect(api.weChatMiniProgramLogin('code')).rejects.toThrow()
    expect(taroMocks.request).not.toHaveBeenCalled()
  })
  it('rejects under-age and stale consent without sending a request', async () => {
    taroMocks.request.mockReset()
    for (const value of [undefined, { accepted: false }, { accepted: true, termsVersion: 'old', privacyVersion: 'old', ageBand: 'ADULT' }, { accepted: true, termsVersion: '2026-09-06.1', privacyVersion: '2026-09-06.1', ageBand: 'UNDER_14' }]) {
      await expect(api.weChatMiniProgramLogin('code', value as never)).rejects.toThrow()
    }
    expect(taroMocks.request).not.toHaveBeenCalled()
  })
  beforeEach(() => {
    taroMocks.storage.clear()
    taroMocks.request.mockReset()
    taroMocks.reLaunch.mockClear()
    taroMocks.setStorageSync.mockClear()
    taroMocks.getStorageSync.mockClear()
    taroMocks.removeStorageSync.mockClear()
  })

  it('shows the original credential error without attempting token refresh on login', async () => {
    taroMocks.request.mockResolvedValueOnce(unauthorized('AUTH_INVALID_CREDENTIALS', '邮箱或密码错误'))

    await expect(api.weChatMiniProgramLogin('invalid-code', { accepted: true, termsVersion: '2026-09-06.1', privacyVersion: '2026-09-06.1', ageBand: 'ADULT' })).rejects.toMatchObject({
      statusCode: 401,
      body: { code: 'AUTH_INVALID_CREDENTIALS', message: '邮箱或密码错误' },
    })
    expect(taroMocks.request).toHaveBeenCalledTimes(1)
    expect(taroMocks.reLaunch).not.toHaveBeenCalled()
  })

  it('clears an invalid protected session and redirects to login once', async () => {
    taroMocks.storage.set('ai-ganfan.access-token', 'expired-access-token')
    taroMocks.request.mockResolvedValueOnce(unauthorized('AUTH_TOKEN_INVALID', '登录状态无效'))

    await expect(api.me()).rejects.toMatchObject({ statusCode: 401 })

    expect(taroMocks.storage.has('ai-ganfan.access-token')).toBe(false)
    expect(taroMocks.reLaunch).toHaveBeenCalledTimes(1)
    expect(taroMocks.reLaunch).toHaveBeenCalledWith({
      url: '/pages/auth/login/index?reason=sessionExpired',
    })
  })
})
