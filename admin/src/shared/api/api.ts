import { z } from 'zod'
import {
  adminUserSchema,
  auditLogSchema,
  authDataSchema,
  currentUserSchema,
  dashboardDataSchema,
  pageSchema,
  temporaryPasswordDataSchema,
  type AuditAction,
  type AuditResult,
  type UserStatus,
} from '../contracts/contracts'
import { apiRequest } from './client'

export type DashboardQuery = { startDate?: string; endDate?: string }
export type UserListQuery = {
  email?: string; nickname?: string; status?: UserStatus
  registeredStartDate?: string; registeredEndDate?: string; page?: number; size?: number
}
export type AuditQuery = {
  adminUserId?: string; targetUserId?: string; action?: AuditAction; result?: AuditResult
  startDate?: string; endDate?: string; page?: number; size?: number
}

export const api = {
  login: (email: string, password: string) => apiRequest('POST', '/auth/login', authDataSchema, {
    anonymous: true, retry401: false, body: { email, password },
  }),
  me: () => apiRequest('GET', '/users/me', currentUserSchema),
  changePassword: (currentPassword: string, newPassword: string, confirmNewPassword: string) =>
    apiRequest('POST', '/users/me/change-password', z.null(), { body: { currentPassword, newPassword, confirmNewPassword } }),
  logout: (refreshToken: string) => apiRequest('POST', '/auth/logout', z.null(), {
    body: { refreshToken }, anonymous: true, retry401: false,
  }),
  dashboard: (query: DashboardQuery) => apiRequest('GET', '/admin/dashboard', dashboardDataSchema, { query }),
  users: (query: UserListQuery) => apiRequest('GET', '/admin/users', pageSchema(adminUserSchema), { query }),
  updateUserStatus: (id: string, status: 'ACTIVE' | 'DISABLED') =>
    apiRequest('PATCH', `/admin/users/${id}/status`, adminUserSchema, { body: { status } }),
  createTemporaryPassword: (id: string) =>
    apiRequest('POST', `/admin/users/${id}/temporary-password`, temporaryPasswordDataSchema),
  auditLogs: (query: AuditQuery) => apiRequest('GET', '/admin/audit-logs', pageSchema(auditLogSchema), { query }),
}
