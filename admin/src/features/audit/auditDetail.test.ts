// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { safeAuditDetails } from './auditDetail'

describe('safeAuditDetails', () => {
  it('returns only documented non-sensitive detail fields', () => {
    expect(safeAuditDetails({
      before: 'ACTIVE',
      after: 'DISABLED',
      reason: '状态已变化',
      expiresAt: '2026-08-22T09:00:00Z',
      password: 'secret',
      accessToken: 'token',
      arbitrary: 'hidden',
    })).toEqual([
      ['变更前状态', 'ACTIVE'],
      ['变更后状态', 'DISABLED'],
      ['失效时间', '2026-08-22T09:00:00Z'],
      ['失败原因', '状态已变化'],
    ])
  })
})
