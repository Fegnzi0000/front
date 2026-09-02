import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../../shared/api/api'
import { ApiClientError, setSessionInvalidHandler } from '../../shared/api/client'
import { sessionStore } from '../../shared/api/sessionStore'
import type { CurrentUser } from '../../shared/contracts/contracts'

type AuthStatus = 'loading' | 'anonymous' | 'authenticated' | 'force-change'
type AuthContextValue = {
  status: AuthStatus
  user: CurrentUser | null
  notice: string | null
  login: (account: string, password: string) => Promise<'home' | 'change-password'>
  changePassword: (current: string, next: string, confirm: string) => Promise<void>
  logout: () => Promise<void>
  clearNotice: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const clearSession = useCallback((message?: string) => {
    sessionStore.clear()
    queryClient.clear()
    setUser(null)
    setStatus('anonymous')
    if (message) setNotice(message)
  }, [queryClient])

  useEffect(() => {
    setSessionInvalidHandler((reason) => clearSession(reason === 'forbidden' ? '当前账号没有管理员权限' : '登录已失效，请重新登录'))
    return () => setSessionInvalidHandler(null)
  }, [clearSession])

  useEffect(() => {
    let active = true
    const restore = async () => {
      if (!sessionStore.getRefreshToken()) {
        if (active) setStatus('anonymous')
        return
      }
      try {
        const current = await api.me()
        if (!active) return
        if (current.role !== 'ADMIN') {
          clearSession('当前账号不是管理员')
          return
        }
        setUser(current)
        setStatus(current.mustChangePassword ? 'force-change' : 'authenticated')
      } catch {
        if (active) clearSession('登录已失效，请重新登录')
      }
    }
    void restore()
    return () => { active = false }
  }, [clearSession])

  const login = useCallback(async (account: string, password: string) => {
    const data = await api.login(account, password)
    if (data.user.role !== 'ADMIN') {
      clearSession('该账号不是管理员')
      throw new ApiClientError(403, 'AUTH_FORBIDDEN', '该账号不是管理员')
    }
    sessionStore.setTokens(data.accessToken, data.refreshToken)
    setUser(data.user)
    setNotice(null)
    if (data.nextStep === 'CHANGE_PASSWORD') {
      setStatus('force-change')
      return 'change-password' as const
    }
    if (data.nextStep !== 'ADMIN_HOME') {
      clearSession('该账号不能进入管理员后台')
      throw new ApiClientError(403, 'AUTH_FORBIDDEN', '该账号不能进入管理员后台')
    }
    setStatus('authenticated')
    return 'home' as const
  }, [clearSession])

  const changePassword = useCallback(async (current: string, next: string, confirm: string) => {
    await api.changePassword(current, next, confirm)
    // 后端改密会递增auth_version并撤销Refresh Token，旧会话不能继续请求/users/me。
    clearSession('密码已修改，请使用新密码重新登录')
  }, [clearSession])

  const logout = useCallback(async () => {
    const refreshToken = sessionStore.getRefreshToken()
    try {
      if (refreshToken) await api.logout(refreshToken)
    } catch {
      // Logout is best-effort; local session removal is authoritative for the browser.
    } finally {
      clearSession()
    }
  }, [clearSession])

  const value = useMemo<AuthContextValue>(() => ({
    status, user, notice, login, changePassword, logout, clearNotice: () => setNotice(null),
  }), [status, user, notice, login, changePassword, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
