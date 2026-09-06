// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { getUserActions } from './userActions'

describe('getUserActions', () => {
  it('does not offer password operations for consumer users', () => {
    expect(getUserActions('ACTIVE')).toEqual(['DISABLE'])
  })

  it('allows only enabling disabled users', () => {
    expect(getUserActions('DISABLED')).toEqual(['ENABLE'])
  })

  it('offers no account actions for cancelled users', () => {
    expect(getUserActions('CANCELLED')).toEqual([])
  })
})
