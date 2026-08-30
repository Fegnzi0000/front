// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { toQueryString } from './queryString'

describe('toQueryString', () => {
  it('omits empty values and preserves zero-based pagination', () => {
    expect(toQueryString({ email: '', nickname: undefined, page: 0, size: 20, status: 'ACTIVE' }))
      .toBe('?page=0&size=20&status=ACTIVE')
  })
})
