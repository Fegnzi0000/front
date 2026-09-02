import { z } from 'zod'

/** 后端时间字段当前输出 Unix 秒数；前端统一转换成 ISO 字符串供 dayjs 和页面使用。 */
const dateTimeSchema = z.union([z.iso.datetime(), z.number().finite()])
  .transform((value) => typeof value === 'number' ? new Date(value * 1000).toISOString() : value)

export const roleSchema = z.enum(['USER', 'ADMIN'])
export const userStatusSchema = z.enum(['ACTIVE', 'DISABLED', 'CANCELLED'])
export const auditResultSchema = z.enum(['SUCCESS', 'FAILURE'])
export const recordSourceSchema = z.enum(['MANUAL', 'SLOT'])
export const auditActionSchema = z.enum([
  'USER_DISABLED',
  'USER_ENABLED',
  'USER_STATUS_UNCHANGED',
  'TEMP_PASSWORD_CREATED',
  'USER_STATUS_UPDATE',
  'TEMP_PASSWORD_CREATE',
])

export const currentUserSchema = z.object({
  id: z.string(),
  email: z.email(),
  nickname: z.string(),
  avatarUrl: z.string().nullable(),
  role: roleSchema,
  status: userStatusSchema,
  onboardingCompleted: z.boolean(),
  mustChangePassword: z.boolean(),
})

export const authDataSchema = z.object({
  accessToken: z.string().min(1),
  accessTokenExpiresIn: z.number(),
  refreshToken: z.string().min(1),
  refreshTokenExpiresIn: z.number(),
  user: currentUserSchema,
  nextStep: z.enum(['ADMIN_HOME', 'CHANGE_PASSWORD', 'HOME', 'ONBOARDING']),
})

export const tokenDataSchema = z.object({
  accessToken: z.string().min(1),
  accessTokenExpiresIn: z.number(),
  refreshToken: z.string().min(1),
  refreshTokenExpiresIn: z.number(),
})

export const adminUserSchema = z.object({
  id: z.string(),
  email: z.email(),
  nickname: z.string(),
  role: z.literal('USER'),
  status: userStatusSchema,
  onboardingCompleted: z.boolean(),
  mustChangePassword: z.boolean(),
  createdAt: dateTimeSchema,
  lastLoginAt: dateTimeSchema.nullable(),
})

export const pageSchema = <T extends z.ZodType>(itemSchema: T) => z.object({
  items: z.array(itemSchema),
  page: z.number().int().nonnegative(),
  size: z.number().int().positive().max(100),
  totalElements: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
})

export const dashboardDataSchema = z.object({
  range: z.object({ startDate: z.iso.date(), endDate: z.iso.date(), timezone: z.literal('Asia/Shanghai') }),
  summary: z.object({
    totalUsers: z.number().int().nonnegative(),
    todayNewUsers: z.number().int().nonnegative(),
    activeUsers: z.number().int().nonnegative(),
    dietRecords: z.number().int().nonnegative(),
    slotSpins: z.number().int().nonnegative(),
    slotConfirmed: z.number().int().nonnegative(),
    slotConfirmationRate: z.string().regex(/^\d+\.\d{2}$/),
  }),
  dailySeries: z.array(z.object({
    date: z.iso.date(),
    newUsers: z.number().int().nonnegative(),
    activeUsers: z.number().int().nonnegative(),
    dietRecords: z.number().int().nonnegative(),
  })),
  recordSourceDistribution: z.array(z.object({
    source: recordSourceSchema,
    count: z.number().int().nonnegative(),
    percentage: z.string().regex(/^\d+\.\d{2}$/),
  })),
})

export const temporaryPasswordDataSchema = z.object({
  temporaryPassword: z.string().min(1),
  expiresAt: dateTimeSchema,
})

export const auditAdminSchema = z.object({
  account: z.string().nullable(),
  nickname: z.string().nullable(),
})

export const auditTargetUserSchema = z.object({
  email: z.email().nullable(),
  nickname: z.string().nullable(),
})

export const auditLogSchema = z.object({
  id: z.string(),
  admin: auditAdminSchema,
  targetUser: auditTargetUserSchema.nullable(),
  action: auditActionSchema,
  result: auditResultSchema,
  requestId: z.string().nullable(),
  detail: z.record(z.string(), z.string()),
  createdAt: dateTimeSchema,
})

export const apiSuccessSchema = <T extends z.ZodType>(schema: T) => z.object({
  code: z.literal('OK'),
  message: z.string(),
  data: schema,
  requestId: z.string(),
  // 后端 Instant 当前由 Jackson 序列化为 Unix 秒数；Mock 与未来 ISO 字符串配置也兼容。
  timestamp: z.union([z.number().finite().nonnegative(), z.iso.datetime()]),
})

export type Role = z.infer<typeof roleSchema>
export type UserStatus = z.infer<typeof userStatusSchema>
export type AuditResult = z.infer<typeof auditResultSchema>
export type RecordSource = z.infer<typeof recordSourceSchema>
export type AuditAction = z.infer<typeof auditActionSchema>
export type CurrentUser = z.infer<typeof currentUserSchema>
export type AuthData = z.infer<typeof authDataSchema>
export type TokenData = z.infer<typeof tokenDataSchema>
export type AdminUser = z.infer<typeof adminUserSchema>
export type DashboardData = z.infer<typeof dashboardDataSchema>
export type TemporaryPasswordData = z.infer<typeof temporaryPasswordDataSchema>
export type AuditLog = z.infer<typeof auditLogSchema>
export type Page<T> = { items: T[]; page: number; size: number; totalElements: number; totalPages: number }

export type ApiSuccess<T> = { code: 'OK'; message: string; data: T; requestId: string; timestamp: string | number }
export type ApiErrorBody = {
  code: string
  message: string
  details?: Array<{ field?: string; reason?: string }>
  requestId?: string
  timestamp?: string | number
}
