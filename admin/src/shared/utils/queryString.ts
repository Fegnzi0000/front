export function toQueryString(query: Record<string, unknown>): string {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      params.set(key, String(value))
    }
  })
  const serialized = params.toString()
  return serialized ? `?${serialized}` : ''
}
