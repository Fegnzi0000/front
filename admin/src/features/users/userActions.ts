import type { UserStatus } from '../../shared/contracts/contracts'

export type UserAction = 'ENABLE' | 'DISABLE' | 'TEMP_PASSWORD'

export function getUserActions(status: UserStatus): UserAction[] {
  if (status === 'ACTIVE') return ['DISABLE']
  if (status === 'DISABLED') return ['ENABLE']
  return []
}
