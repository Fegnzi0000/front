// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { adminUserSchema, apiSuccessSchema, auditLogSchema, currentUserSchema, dashboardDataSchema } from './contracts'

describe('API contracts', () => {
  it('rejects product roles outside USER and ADMIN', () => {
    const result = currentUserSchema.safeParse({
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'root@example.com',
      nickname: 'Root',
      avatarUrl: null,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      onboardingCompleted: true,
      mustChangePassword: false,
    })
    expect(result.success).toBe(false)
  })

  it('accepts a complete dashboard response envelope', () => {
    const schema = apiSuccessSchema(dashboardDataSchema)
    const result = schema.safeParse({
      code: 'OK',
      message: '获取成功',
      data: {
        range: { startDate: '2026-08-16', endDate: '2026-08-22', timezone: 'Asia/Shanghai' },
        summary: { totalUsers: 10, todayNewUsers: 1, activeUsers: 8, dietRecords: 20, slotSpins: 12, slotConfirmed: 9, slotConfirmationRate: '75.00' },
        dailySeries: [{ date: '2026-08-22', newUsers: 1, activeUsers: 4, dietRecords: 5 }],
        recordSourceDistribution: [{ source: 'MANUAL', count: 11, percentage: '55.00' }, { source: 'SLOT', count: 9, percentage: '45.00' }],
      },
      requestId: 'request-id',
      timestamp: 1787356800.0,
    })
    expect(result.success).toBe(true)
  })

  it('converts backend Unix-second timestamps used by administrator lists', () => {
    const user = adminUserSchema.parse({
      id: '123e4567-e89b-12d3-a456-426614174000', email: 'demo.user01@local.test', nickname: '联调用户1',
      role: 'USER', status: 'ACTIVE', onboardingCompleted: true, mustChangePassword: false,
      createdAt: 1788139800, lastLoginAt: 1788143400,
    })
    const audit = auditLogSchema.parse({
      id: '123e4567-e89b-12d3-a456-426614174001',
      admin: { account: 'admin', nickname: '本地管理员' },
      targetUser: null, action: 'USER_DISABLED', result: 'SUCCESS', requestId: null,
      detail: { before: 'ACTIVE', after: 'DISABLED' }, createdAt: 1788105852.921,
    })
    expect(user.createdAt).toBe('2026-08-31T01:30:00.000Z')
    expect(audit.createdAt).toBe('2026-08-30T16:04:12.921Z')
  })
})
