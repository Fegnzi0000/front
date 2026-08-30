// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { validateDateRange } from './dateRange'

describe('validateDateRange', () => {
  it('accepts an inclusive 90-day range', () => {
    expect(validateDateRange('2026-01-01', '2026-03-31', 90)).toEqual({ valid: true })
  })

  it('rejects a range longer than 90 days', () => {
    expect(validateDateRange('2026-01-01', '2026-04-01', 90)).toEqual({
      valid: false,
      message: '日期范围不能超过 90 天',
    })
  })

  it('requires both dates together', () => {
    expect(validateDateRange('2026-01-01', undefined, 90)).toEqual({
      valid: false,
      message: '开始日期和结束日期必须同时填写',
    })
  })

  it('rejects an inverted range', () => {
    expect(validateDateRange('2026-02-02', '2026-02-01', 90)).toEqual({
      valid: false,
      message: '开始日期不能晚于结束日期',
    })
  })
})
