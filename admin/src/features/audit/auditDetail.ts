const allowedFields: Array<[string, string]> = [
  ['before', '变更前状态'],
  ['after', '变更后状态'],
  ['expiresAt', '失效时间'],
  ['reason', '失败原因'],
]

export function safeAuditDetails(detail: Record<string, unknown> | null): Array<[string, string]> {
  if (!detail) return []
  return allowedFields.flatMap(([key, label]) => {
    const value = detail[key]
    return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
      ? [[label, String(value)] as [string, string]]
      : []
  })
}
