export type MealType = 'BREAKFAST' | 'LUNCH' | 'AFTERNOON_TEA' | 'DINNER' | 'LATE_NIGHT'
export type StatisticsGroupBy = 'DAY' | 'MONTH' | 'YEAR'
export type SlotStage = 'IDLE' | 'SPINNING' | 'RESULT' | 'CONFIRM' | 'SUCCESS'
export type SlotEvent = 'START' | 'REVEAL' | 'REROLL' | 'CONFIRM_CHOICE' | 'BACK' | 'CLOSE' | 'SAVE' | 'RESET'

interface FoodFilter {
  query?: string
  category?: string
  tags?: string[]
}

export interface DietFilter {
  startDate?: string
  endDate?: string
  mealType?: string
  category?: string
  source?: string
}

export function cloneDietFilter(filter: DietFilter): DietFilter {
  return { ...filter }
}

export function validatePassword(password: string): string | null {
  return /^[A-Za-z0-9_]{6,20}$/.test(password)
    ? null
    : '密码需为6～20位字母、数字或下划线'
}

export function validatePasswordChange(
  currentPassword: string,
  newPassword: string,
  confirmation: string,
): string | null {
  const passwordError = validatePassword(newPassword)
  if (passwordError) return passwordError
  if (newPassword === currentPassword) return '新密码不能与当前密码相同'
  if (newPassword !== confirmation) return '两次输入的新密码不一致'
  return null
}

export function validateBudget(enabled: boolean, amount: string | null): string | null {
  if (!enabled) return amount === null ? null : '关闭预算后金额必须为空'
  if (amount === null || !/^\d+(?:\.\d{1,2})?$/.test(amount)) {
    return '请输入0～100000之间、最多两位小数的金额'
  }
  const [integer] = amount.split('.')
  return Number(integer) <= 100000
    ? null
    : '请输入0～100000之间、最多两位小数的金额'
}

export function inferMealType(hour: number): MealType {
  if (hour >= 5 && hour < 10) return 'BREAKFAST'
  if (hour >= 10 && hour < 14) return 'LUNCH'
  if (hour >= 14 && hour < 17) return 'AFTERNOON_TEA'
  if (hour >= 17 && hour < 22) return 'DINNER'
  return 'LATE_NIGHT'
}

export function pickFood<T extends { id: string }>(
  foods: T[],
  excludeLastId?: string,
  random: () => number = Math.random,
): T {
  if (foods.length === 0) throw new Error('FOOD_POOL_EMPTY')
  if (foods.length === 1 && excludeLastId === foods[0].id) {
    throw new Error('SLOT_RETRY_UNAVAILABLE')
  }

  const candidates = foods.length > 1 && excludeLastId
    ? foods.filter((food) => food.id !== excludeLastId)
    : foods
  const index = Math.min(candidates.length - 1, Math.floor(random() * candidates.length))
  return candidates[index]
}

interface DietAmount {
  actualPrice: string
  businessDate: string
}

interface DietSummary {
  totalSpent: string
  recordCount: number
  recordedDays: number
  averageDailySpent: string
}

function toCents(amount: string): number {
  const [integer, decimal = ''] = amount.split('.')
  return Number(integer) * 100 + Number(decimal.padEnd(2, '0').slice(0, 2))
}

function fromCents(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`
}

export function calculateDietSummary(records: DietAmount[]): DietSummary {
  const totalCents = records.reduce((total, record) => total + toCents(record.actualPrice), 0)
  const recordedDays = new Set(records.map((record) => record.businessDate)).size
  const averageCents = recordedDays === 0 ? 0 : Math.round(totalCents / recordedDays)
  return {
    totalSpent: fromCents(totalCents),
    recordCount: records.length,
    recordedDays,
    averageDailySpent: fromCents(averageCents),
  }
}

export function calculateDietStatistics<
  T extends DietAmount & { category: string | null },
>(records: T[], groupBy: StatisticsGroupBy) {
  const periodLength = groupBy === 'DAY' ? 10 : groupBy === 'MONTH' ? 7 : 4
  const periodTotals = new Map<string, number>()
  const categoryTotals = new Map<string, { totalCents: number; recordCount: number }>()

  records.forEach((record) => {
    const cents = toCents(record.actualPrice)
    const period = record.businessDate.slice(0, periodLength)
    periodTotals.set(period, (periodTotals.get(period) ?? 0) + cents)

    const category = record.category?.trim() || '未分类'
    const current = categoryTotals.get(category) ?? { totalCents: 0, recordCount: 0 }
    current.totalCents += cents
    current.recordCount += 1
    categoryTotals.set(category, current)
  })

  return {
    ...calculateDietSummary(records),
    spendingSeries: [...periodTotals.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([period, totalCents]) => ({ period, totalSpent: fromCents(totalCents) })),
    categoryDistribution: [...categoryTotals.entries()]
      .sort(([leftCategory, left], [rightCategory, right]) => (
        right.totalCents - left.totalCents || leftCategory.localeCompare(rightCategory)
      ))
      .map(([category, value]) => ({
        category,
        totalSpent: fromCents(value.totalCents),
        recordCount: value.recordCount,
      })),
  }
}

export function calculateBudgetOverview(
  spent: string,
  budgetEnabled: boolean,
  budget: string | null,
) {
  if (!budgetEnabled || budget === null) {
    return { enabled: false, spent, budget: null, remaining: null, progress: 0, exceeded: false }
  }
  const spentValue = Number(spent)
  const budgetValue = Number(budget)
  const remaining = budgetValue - spentValue
  return {
    enabled: true,
    spent,
    budget,
    remaining: remaining.toFixed(2),
    progress: budgetValue <= 0 ? 0 : Math.min(100, spentValue / budgetValue * 100),
    exceeded: remaining < 0,
  }
}

export function getBudgetPresentation(overview: ReturnType<typeof calculateBudgetOverview>): {
  label: string
  amountLabel: string
  amount: string | null
} {
  if (!overview.enabled || overview.remaining === null) {
    return { label: '今日预算', amountLabel: '', amount: null }
  }
  if (overview.exceeded) {
    return {
      label: '超预算啦！',
      amountLabel: '已超出',
      amount: Math.abs(Number(overview.remaining)).toFixed(2),
    }
  }
  return { label: '今日剩余预算', amountLabel: '', amount: overview.remaining }
}

export const BUSINESS_TIME_ZONE = 'Asia/Shanghai'

/** 返回统一的中国业务日期与时间；页面不得直接从UTC ISO字符串截取日期或小时。 */
export function getShanghaiDateTime(now = new Date()): { date: string; time: string; hour: number } {
  // 微信真机 JS 运行时可能没有 Intl。中国时区固定为 UTC+8 且不使用夏令时，
  // 因此将时间戳偏移后用 UTC 字段读取，可保持 Asia/Shanghai 语义且不依赖 Intl。
  const shanghai = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  const year = shanghai.getUTCFullYear()
  const month = String(shanghai.getUTCMonth() + 1).padStart(2, '0')
  const day = String(shanghai.getUTCDate()).padStart(2, '0')
  const hour = shanghai.getUTCHours()
  const minute = String(shanghai.getUTCMinutes()).padStart(2, '0')
  return {
    date: `${year}-${month}-${day}`,
    time: `${String(hour).padStart(2, '0')}:${minute}`,
    hour,
  }
}

export function getShanghaiMonthRange(now = new Date()): { start: string; end: string } {
  const { date } = getShanghaiDateTime(now)
  const [year, month] = date.split('-').map(Number)
  const lastDay = new Date(year, month, 0).getDate()
  const monthText = String(month).padStart(2, '0')
  return { start: `${year}-${monthText}-01`, end: `${year}-${monthText}-${lastDay}` }
}

function localDateText(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function getCurrentWeekRange(now = new Date()): { start: string; end: string } {
  const [year, month, day] = getShanghaiDateTime(now).date.split('-').map(Number)
  const today = new Date(year, month - 1, day)
  const mondayOffset = (today.getDay() + 6) % 7
  const start = new Date(today)
  start.setDate(today.getDate() - mondayOffset)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return { start: localDateText(start), end: localDateText(end) }
}

export function getHistoryStatisticsRanges(
  overviewStart: string,
  overviewEnd: string,
  now = new Date(),
): { overview: { start: string; end: string }; weekly: { start: string; end: string } } {
  return {
    overview: { start: overviewStart, end: overviewEnd },
    weekly: getCurrentWeekRange(now),
  }
}

export function getRecordCountPresentation(totalElements: number, visibleElements: number): string {
  return totalElements > visibleElements
    ? `共 ${totalElements} 条 · 显示前 ${visibleElements} 条`
    : `共 ${totalElements} 条`
}

export function buildWeeklySpendingSeries(
  points: Array<{ period: string; totalSpent: string }>,
  weekStart: string,
): Array<{ period: string; label: string; totalSpent: string }> {
  const totals = new Map(points.map((point) => [point.period, point.totalSpent]))
  const labels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const start = parseLocalDate(weekStart)
  return labels.map((label, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    const period = localDateText(date)
    return { period, label, totalSpent: totals.get(period) ?? '0.00' }
  })
}

const publicAuthPaths = new Set([
  '/auth/login', '/auth/register', '/auth/refresh', '/auth/logout',
  '/auth/wechat/mini-program/login', '/auth/wechat/mini-program/bind',
])

export function shouldAttemptTokenRefresh(path: string, statusCode: number): boolean {
  return statusCode === 401 && !publicAuthPaths.has(path)
}

/** `null` 表示当前登录流程只属于独立网页管理端，不应进入小程序页面。 */
export function resolveLoginNextStep(
  nextStep: 'ONBOARDING' | 'HOME' | 'ADMIN_HOME' | 'CHANGE_PASSWORD',
): string | null {
  if (nextStep === 'ONBOARDING') return '/pages/onboarding/index'
  if (nextStep === 'ADMIN_HOME') return null
  if (nextStep === 'CHANGE_PASSWORD') return '/pages/account/security/index'
  return '/pages/home/index'
}

/** 小程序登录页只展示与普通用户有关的会话提示，不暴露独立管理端入口。 */
export function getMiniProgramLoginFeedback(
  reason?: string,
  role?: 'USER' | 'ADMIN' | 'SUPER_ADMIN',
): string {
  if (reason === 'passwordChanged') return '密码已修改，请使用新密码重新登录'
  if (reason === 'sessionExpired') return '登录已失效，请重新登录'
  if (role && role !== 'USER') return '当前账号无法使用小程序'
  return ''
}

/** 恢复本地会话时，管理员账号返回 `null`，由启动页清理小程序会话。 */
export function resolveAuthenticatedRoute(user: {
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN'
  onboardingCompleted: boolean
  mustChangePassword: boolean
}): string | null {
  if (user.role !== 'USER') return null
  if (user.mustChangePassword) return '/pages/account/security/index'
  if (!user.onboardingCompleted) return '/pages/onboarding/index'
  return '/pages/home/index'
}

export function getProfileFoodActions() {
  return [{
    icon: '池',
    title: '食物池管理',
    note: '可编辑名称、价格和标签',
    route: '/pages/foods/index',
    navigation: 'switchTab' as const,
  }]
}

export type SlotSoundCommand = 'PLAY' | 'STOP' | 'NONE'

export function getSlotSoundCommand(enabled: boolean, event: SlotEvent): SlotSoundCommand {
  if (!enabled) return 'NONE'
  if (event === 'START' || event === 'REROLL') return 'PLAY'
  if (event === 'REVEAL' || event === 'CLOSE') return 'STOP'
  return 'NONE'
}

export function calculateHeaderOffset(statusBarHeight: number, capsuleBottom: number): number {
  return Math.max(statusBarHeight, capsuleBottom) + 12
}

const mainTabRoutes = new Set([
  'pages/home/index',
  'pages/foods/index',
  'pages/slot/index',
  'pages/history/index',
  'pages/profile/index',
])

export function shouldShowPageBack(route: string): boolean {
  const normalizedRoute = route.replace(/^\//, '')
  return normalizedRoute.length > 0 && !mainTabRoutes.has(normalizedRoute)
}

export function buildReelFrames<T>(items: T[], frameCount = 12): T[] {
  if (items.length === 0) return []
  return Array.from({ length: frameCount }, (_, index) => items[index % items.length])
}

export function buildSlotReels<T extends { id: string }>(
  foods: T[],
  selectedFood: T,
  frameCount = 15,
): T[][] {
  const candidates = foods.length > 0 ? foods : [selectedFood]
  const rollingFrameCount = Math.max(1, frameCount - 1)

  return [0, 1, 2].map((column) => [
    ...Array.from(
      { length: rollingFrameCount },
      (_, index) => candidates[(index + column) % candidates.length],
    ),
    selectedFood,
  ])
}

export function getSlotReelStopDelays(): [number, number, number] {
  return [1800, 2400, 3000]
}

export function getSlotRevealDelay(): number {
  const stopDelays = getSlotReelStopDelays()
  return stopDelays[stopDelays.length - 1] + 100
}

export function getSlotMachinePresentation() {
  return { showPaylines: false }
}

export function filterFoodOptions<T extends { name: string; category: string; tags: string[] }>(
  foods: T[],
  filter: FoodFilter,
): T[] {
  const query = filter.query?.replace(/\s/g, '').toLocaleLowerCase() ?? ''
  const tags = filter.tags ?? []
  return foods.filter((food) => {
    const normalizedName = food.name.replace(/\s/g, '').toLocaleLowerCase()
    return (!query || normalizedName.includes(query))
      && (!filter.category || food.category === filter.category)
      && tags.every((tag) => food.tags.includes(tag))
  })
}

export function filterDietRecords<
  T extends { businessDate: string; mealType: string; category: string | null; source: string },
>(records: T[], filter: DietFilter): T[] {
  return records.filter((record) => (
    (!filter.startDate || record.businessDate >= filter.startDate)
    && (!filter.endDate || record.businessDate <= filter.endDate)
    && (!filter.mealType || record.mealType === filter.mealType)
    && (!filter.category || record.category === filter.category)
    && (!filter.source || record.source === filter.source)
  ))
}

export function nextSlotStage(stage: SlotStage, event: SlotEvent): SlotStage {
  const transitions: Partial<Record<SlotStage, Partial<Record<SlotEvent, SlotStage>>>> = {
    IDLE: { START: 'SPINNING' },
    SPINNING: { REVEAL: 'RESULT', CLOSE: 'IDLE' },
    RESULT: { REROLL: 'SPINNING', CONFIRM_CHOICE: 'CONFIRM', CLOSE: 'IDLE' },
    CONFIRM: { BACK: 'RESULT', SAVE: 'SUCCESS', CLOSE: 'IDLE' },
    SUCCESS: { RESET: 'IDLE', CLOSE: 'IDLE' },
  }
  return transitions[stage]?.[event] ?? stage
}

export function shouldHideTabBar(stage: SlotStage): boolean {
  return stage === 'RESULT' || stage === 'CONFIRM' || stage === 'SUCCESS'
}

function validateMoney(amount: string): string | null {
  if (!/^\d+(?:\.\d{1,2})?$/.test(amount) || Number(amount) > 100000) {
    return '请输入0～100000之间、最多两位小数的价格'
  }
  return null
}

export function validateFoodOption(input: {
  name: string
  category: string
  defaultPrice: string
  tags: string[]
}): string | null {
  const nameLength = Array.from(input.name.trim()).length
  if (nameLength < 1 || nameLength > 10) return '请输入1～10个字符的食物名称'
  const categoryLength = Array.from(input.category.trim()).length
  if (categoryLength < 1 || categoryLength > 10) return '请输入1～10个字符的分类'
  const priceError = validateMoney(input.defaultPrice)
  if (priceError) return priceError
  if (input.tags.length > 50) return '每个食物最多设置50个标签'
  if (input.tags.some((tag) => Array.from(tag.trim()).length > 20)) return '单个标签不能超过20个字符'
  return null
}

export function validateDietEntry(actualPrice: string, eatenAt: string, now = new Date()): string | null {
  const priceError = validateMoney(actualPrice)
  if (priceError) return priceError
  const time = new Date(eatenAt)
  if (Number.isNaN(time.getTime())) return '请选择有效的用餐时间'
  if (time.getTime() > now.getTime()) return '用餐时间不能晚于当前时间'
  return null
}
