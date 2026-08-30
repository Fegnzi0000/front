import { Tag } from 'antd'
import type { AuditResult, UserStatus } from '../contracts/contracts'

const userStatusMap: Record<UserStatus, { color: string; label: string }> = {
  ACTIVE: { color: 'success', label: '正常' },
  DISABLED: { color: 'warning', label: '已禁用' },
  CANCELLED: { color: 'default', label: '已注销' },
}

export function UserStatusTag({ status }: { status: UserStatus }) {
  const value = userStatusMap[status]
  return <Tag color={value.color}>{value.label}</Tag>
}

export function AuditResultTag({ result }: { result: AuditResult }) {
  return <Tag color={result === 'SUCCESS' ? 'success' : 'error'}>{result === 'SUCCESS' ? '成功' : '失败'}</Tag>
}
