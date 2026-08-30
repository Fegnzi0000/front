export type DateRangeValidation = { valid: true } | { valid: false; message: string }

export function validateDateRange(
  startDate: string | undefined,
  endDate: string | undefined,
  maxDays: number,
): DateRangeValidation {
  if (Boolean(startDate) !== Boolean(endDate)) {
    return { valid: false, message: '开始日期和结束日期必须同时填写' }
  }
  if (!startDate || !endDate) return { valid: true }

  const start = new Date(`${startDate}T00:00:00Z`)
  const end = new Date(`${endDate}T00:00:00Z`)
  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf())) {
    return { valid: false, message: '日期格式不正确' }
  }
  if (start > end) return { valid: false, message: '开始日期不能晚于结束日期' }

  const inclusiveDays = Math.floor((end.valueOf() - start.valueOf()) / 86_400_000) + 1
  if (inclusiveDays > maxDays) {
    return { valid: false, message: `日期范围不能超过 ${maxDays} 天` }
  }
  return { valid: true }
}
