// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { apiSuccessSchema, currentUserSchema, dashboardDataSchema } from './contracts'

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
})
