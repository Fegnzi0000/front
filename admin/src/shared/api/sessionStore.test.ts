import { beforeEach, describe, expect, it } from 'vitest'
import { sessionStore } from './sessionStore'

describe('sessionStore', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
    sessionStore.clear()
  })

  it('keeps the access token in memory only', () => {
    sessionStore.setTokens('access-token', 'refresh-token')
    expect(sessionStore.getAccessToken()).toBe('access-token')
    expect(sessionStorage.getItem('ai-ganfan.admin.refresh-token')).toBe('refresh-token')
    expect(sessionStorage.getItem('ai-ganfan.admin.access-token')).toBeNull()
    expect(localStorage.length).toBe(0)
  })

  it('clears both memory and session refresh token', () => {
    sessionStore.setTokens('access-token', 'refresh-token')
    sessionStore.clear()
    expect(sessionStore.getAccessToken()).toBeNull()
    expect(sessionStore.getRefreshToken()).toBeNull()
  })
})
