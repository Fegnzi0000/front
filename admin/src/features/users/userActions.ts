import type { UserStatus } from '../../shared/contracts/contracts'

export type UserAction = 'ENABLE' | 'DISABLE'

export function getUserActions(status: UserStatus): UserAction[] {
  if (status === 'ACTIVE') return ['DISABLE']
  if (status === 'DISABLED') return ['ENABLE']
  return []
}
