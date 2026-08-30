// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { getUserActions } from './userActions'

describe('getUserActions', () => {
  it('allows disabling and temporary passwords for active users', () => {
    expect(getUserActions('ACTIVE')).toEqual(['DISABLE', 'TEMP_PASSWORD'])
  })

  it('allows only enabling disabled users', () => {
    expect(getUserActions('DISABLED')).toEqual(['ENABLE'])
  })

  it('offers no account actions for cancelled users', () => {
    expect(getUserActions('CANCELLED')).toEqual([])
  })
})
