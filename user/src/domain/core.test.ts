import { describe, expect, it } from 'vitest'
import * as coreModule from './core'

import {
  buildWeeklySpendingSeries,
  buildReelFrames,
  buildSlotReels,
  calculateBudgetOverview,
  calculateDietStatistics,
  calculateDietSummary,
  calculateHeaderOffset,
  cloneDietFilter,
  filterDietRecords,
  filterFoodOptions,
  getBudgetPresentation,
  getCurrentWeekRange,
  getShanghaiDateTime,
  getShanghaiMonthRange,
  getProfileFoodActions,
  getSlotReelStopDelays,
  getSlotRevealDelay,
  getSlotSoundCommand,
  getSlotMachinePresentation,
  inferMealType,
  nextSlotStage,
  pickFood,
  resolveAuthenticatedRoute,
  resolveLoginNextStep,
  shouldAttemptTokenRefresh,
  shouldHideTabBar,
  shouldShowPageBack,
  validateDietEntry,
  validateFoodOption,
  validateBudget,
  validatePassword,
  validatePasswordChange,
} from './core'

describe('validatePassword', () => {
  it('accepts 6 to 20 letters numbers and underscores', () => {
    expect(validatePassword('abc123')).toBeNull()
    expect(validatePassword('meal_2026')).toBeNull()
  })

  it('rejects invalid length or characters', () => {
    expect(validatePassword('abc12')).toBe('密码需为6～20位字母、数字或下划线')
    expect(validatePassword('abc 123')).toBe('密码需为6～20位字母、数字或下划线')
    expect(validatePassword('吃饭123456')).toBe('密码需为6～20位字母、数字或下划线')
  })
})

describe('validateBudget', () => {
  it('requires null amount when budget is disabled', () => {
    expect(validateBudget(false, null)).toBeNull()
    expect(validateBudget(false, '50.00')).toBe('关闭预算后金额必须为空')
  })

  it('accepts zero and two decimal places when enabled', () => {
    expect(validateBudget(true, '0.00')).toBeNull()
    expect(validateBudget(true, '100000.00')).toBeNull()
    expect(validateBudget(true, '12.345')).toBe('请输入0～100000之间、最多两位小数的金额')
  })
})

describe('inferMealType', () => {
  it('maps local hours to the five product meal types', () => {
    expect(inferMealType(8)).toBe('BREAKFAST')
    expect(inferMealType(12)).toBe('LUNCH')
    expect(inferMealType(15)).toBe('AFTERNOON_TEA')
    expect(inferMealType(19)).toBe('DINNER')
    expect(inferMealType(23)).toBe('LATE_NIGHT')
  })
})

describe('pickFood', () => {
  const foods = [
    { id: 'a', name: '鸡腿饭' },
    { id: 'b', name: '牛肉面' },
    { id: 'c', name: '馄饨' },
  ]

  it('uses the complete pool and excludes only the previous result', () => {
    expect(pickFood(foods, 'a', () => 0)).toEqual(foods[1])
    expect(pickFood(foods, undefined, () => 0.99)).toEqual(foods[2])
  })

  it('reports the product error when the pool is empty', () => {
    expect(() => pickFood([], undefined, () => 0)).toThrowError('FOOD_POOL_EMPTY')
  })

  it('rejects a reroll when only one food exists', () => {
    expect(() => pickFood([foods[0]], 'a', () => 0)).toThrowError('SLOT_RETRY_UNAVAILABLE')
  })
})

describe('calculateDietSummary', () => {
  it('calculates total and average by recorded days', () => {
    const summary = calculateDietSummary([
      { actualPrice: '18.50', businessDate: '2026-08-08' },
      { actualPrice: '10.00', businessDate: '2026-08-08' },
      { actualPrice: '21.50', businessDate: '2026-08-07' },
    ])

    expect(summary).toEqual({
      totalSpent: '50.00',
      recordCount: 3,
      recordedDays: 2,
      averageDailySpent: '25.00',
    })
  })
})

describe('calculateDietStatistics', () => {
  const records = [
    { actualPrice: '18.50', businessDate: '2026-08-08', category: '米饭' },
    { actualPrice: '10.00', businessDate: '2026-08-08', category: '面食' },
    { actualPrice: '21.50', businessDate: '2026-08-07', category: '米饭' },
  ]

  it('groups spending chronologically and categories by total spending', () => {
    expect(calculateDietStatistics(records, 'DAY')).toMatchObject({
      spendingSeries: [
        { period: '2026-08-07', totalSpent: '21.50' },
        { period: '2026-08-08', totalSpent: '28.50' },
      ],
      categoryDistribution: [
        { category: '米饭', totalSpent: '40.00', recordCount: 2 },
        { category: '面食', totalSpent: '10.00', recordCount: 1 },
      ],
    })
  })

  it('supports month and year periods required by the statistics API', () => {
    expect(calculateDietStatistics(records, 'MONTH').spendingSeries).toEqual([
      { period: '2026-08', totalSpent: '50.00' },
    ])
    expect(calculateDietStatistics(records, 'YEAR').spendingSeries).toEqual([
      { period: '2026', totalSpent: '50.00' },
    ])
  })
})

describe('home budget overview', () => {
  it('calculates a clamped budget progress and remaining amount', () => {
    expect(calculateBudgetOverview('30.00', true, '50.00')).toEqual({
      enabled: true,
      spent: '30.00',
      budget: '50.00',
      remaining: '20.00',
      progress: 60,
      exceeded: false,
    })
    expect(calculateBudgetOverview('75.00', true, '50.00').progress).toBe(100)
    expect(calculateBudgetOverview('75.00', true, '50.00').exceeded).toBe(true)
  })

  it('switches the remaining-budget copy to an over-budget warning', () => {
    expect(getBudgetPresentation(calculateBudgetOverview('75.00', true, '50.00'))).toEqual({
      label: '超预算啦！',
      amountLabel: '已超出',
      amount: '25.00',
    })
    expect(getBudgetPresentation(calculateBudgetOverview('30.00', true, '50.00'))).toEqual({
      label: '今日剩余预算',
      amountLabel: '',
      amount: '20.00',
    })
  })
})

describe('Shanghai business time', () => {
  it('uses China time instead of UTC when crossing midnight', () => {
    const now = new Date('2026-09-02T16:15:00.000Z')
    expect(getShanghaiDateTime(now)).toEqual({ date: '2026-09-03', time: '00:15', hour: 0 })
    expect(getShanghaiMonthRange(now)).toEqual({ start: '2026-09-01', end: '2026-09-30' })
  })
})

describe('fixed weekly spending trend', () => {
  it('uses Monday through Sunday for the current week', () => {
    expect(getCurrentWeekRange(new Date(2026, 7, 19))).toEqual({
      start: '2026-08-17',
      end: '2026-08-23',
    })
  })

  it('always returns seven labelled bars and fills missing dates with zero', () => {
    expect(buildWeeklySpendingSeries([
      { period: '2026-08-17', totalSpent: '18.50' },
      { period: '2026-08-19', totalSpent: '12.00' },
    ], '2026-08-17')).toEqual([
      { period: '2026-08-17', label: '周一', totalSpent: '18.50' },
      { period: '2026-08-18', label: '周二', totalSpent: '0.00' },
      { period: '2026-08-19', label: '周三', totalSpent: '12.00' },
      { period: '2026-08-20', label: '周四', totalSpent: '0.00' },
      { period: '2026-08-21', label: '周五', totalSpent: '0.00' },
      { period: '2026-08-22', label: '周六', totalSpent: '0.00' },
      { period: '2026-08-23', label: '周日', totalSpent: '0.00' },
    ])
  })
})

describe('history page data scopes', () => {
  it('keeps the selected overview range separate from fixed weekly analysis', () => {
    const getRanges = (coreModule as unknown as {
      getHistoryStatisticsRanges?: (startDate: string, endDate: string, now: Date) => unknown
    }).getHistoryStatisticsRanges

    expect(getRanges?.('2026-07-01', '2026-07-31', new Date(2026, 7, 19))).toEqual({
      overview: { start: '2026-07-01', end: '2026-07-31' },
      weekly: { start: '2026-08-17', end: '2026-08-23' },
    })
  })

  it('shows the backend total while limiting the visible record list', () => {
    const getCountText = (coreModule as unknown as {
      getRecordCountPresentation?: (totalElements: number, visibleElements: number) => string
    }).getRecordCountPresentation

    expect(getCountText?.(138, 100)).toBe('共 138 条 · 显示前 100 条')
    expect(getCountText?.(28, 28)).toBe('共 28 条')
  })
})

describe('authentication routing and 401 classification', () => {
  it('does not refresh tokens for a wrong-password response from login', () => {
    expect(shouldAttemptTokenRefresh('/auth/login', 401)).toBe(false)
    expect(shouldAttemptTokenRefresh('/auth/register', 401)).toBe(false)
    expect(shouldAttemptTokenRefresh('/users/me', 401)).toBe(true)
    expect(shouldAttemptTokenRefresh('/users/me', 403)).toBe(false)
  })

  it('routes users inside the mini-program and keeps administrators on the web console', () => {
    expect(resolveLoginNextStep('ONBOARDING')).toBe('/pages/onboarding/index')
    expect(resolveLoginNextStep('CHANGE_PASSWORD')).toBe('/pages/account/security/index')
    expect(resolveLoginNextStep('ADMIN_HOME')).toBeNull()
    expect(resolveLoginNextStep('HOME')).toBe('/pages/home/index')

    expect(resolveAuthenticatedRoute({ role: 'USER', onboardingCompleted: false, mustChangePassword: false })).toBe('/pages/onboarding/index')
    expect(resolveAuthenticatedRoute({ role: 'USER', onboardingCompleted: true, mustChangePassword: false })).toBe('/pages/home/index')
    expect(resolveAuthenticatedRoute({ role: 'SUPER_ADMIN', onboardingCompleted: true, mustChangePassword: false })).toBeNull()
    expect(resolveAuthenticatedRoute({ role: 'ADMIN', onboardingCompleted: true, mustChangePassword: true })).toBeNull()
    expect(resolveAuthenticatedRoute({ role: 'USER', onboardingCompleted: true, mustChangePassword: true })).toBe('/pages/account/security/index')
  })

  it('does not expose administrator web-login guidance in the mini-program', () => {
    const feedback = (coreModule as unknown as {
      getMiniProgramLoginFeedback?: (reason?: string, role?: 'USER' | 'ADMIN' | 'SUPER_ADMIN') => string
    }).getMiniProgramLoginFeedback

    expect(feedback?.('adminWebRequired')).toBe('')
    expect(feedback?.(undefined, 'USER')).toBe('')
    expect(feedback?.(undefined, 'ADMIN')).toBe('当前账号无法使用小程序')
    expect(feedback?.(undefined, 'ADMIN')).not.toContain('管理员')
    expect(feedback?.(undefined, 'ADMIN')).not.toContain('网页')
  })
})

describe('profile actions and slot sound', () => {
  it('keeps food-pool management but removes the manual-meal shortcut from My', () => {
    expect(getProfileFoodActions().map((item) => item.title)).toEqual(['食物池管理'])
  })

  it('plays only on an enabled spin and stops when the result is revealed or closed', () => {
    expect(getSlotSoundCommand(true, 'START')).toBe('PLAY')
    expect(getSlotSoundCommand(true, 'REROLL')).toBe('PLAY')
    expect(getSlotSoundCommand(true, 'REVEAL')).toBe('STOP')
    expect(getSlotSoundCommand(true, 'CLOSE')).toBe('STOP')
    expect(getSlotSoundCommand(false, 'START')).toBe('NONE')
  })
})

describe('custom navigation safe area', () => {
  it('places page content below both the status bar and menu capsule', () => {
    expect(calculateHeaderOffset(47, 91)).toBe(103)
    expect(calculateHeaderOffset(47, 0)).toBe(59)
  })
})

describe('page back navigation', () => {
  it('uses tab switching on main pages and back navigation on secondary pages', () => {
    const mainTabs = [
      'pages/home/index',
      'pages/foods/index',
      'pages/slot/index',
      'pages/history/index',
      'pages/profile/index',
    ]
    mainTabs.forEach((route) => expect(shouldShowPageBack(route)).toBe(false))
    expect(shouldShowPageBack('pages/diet/edit/index')).toBe(true)
    expect(shouldShowPageBack('pages/tags/index')).toBe(true)
  })
})

describe('slot reel frames', () => {
  it('repeats a short food pool into a stable animation track', () => {
    const foods = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    const frames = buildReelFrames(foods, 12)
    expect(frames).toHaveLength(12)
    expect(frames.map((item) => item.id)).toEqual(['a', 'b', 'c', 'a', 'b', 'c', 'a', 'b', 'c', 'a', 'b', 'c'])
  })
})

describe('slot reel plan', () => {
  const foods = [
    { id: 'a', name: '猪脚饭' },
    { id: 'b', name: '番茄鸡蛋饭' },
    { id: 'c', name: '牛肉面' },
  ]

  it('keeps dish names on all three reels and locks the selected dish last', () => {
    const reels = buildSlotReels(foods, foods[1], 9)

    expect(reels).toHaveLength(3)
    reels.forEach((reel) => {
      expect(reel).toHaveLength(9)
      expect(reel[reel.length - 1]).toEqual(foods[1])
    })
    expect(reels[0].map((food) => food.id)).not.toEqual(reels[1].map((food) => food.id))
  })

  it('uses the normal left-to-right stagger for every spin', () => {
    expect(getSlotReelStopDelays()).toEqual([1800, 2400, 3000])
    expect(getSlotRevealDelay()).toBe(3100)
  })
})

describe('slot machine presentation', () => {
  it('keeps the dish name unobstructed by decorative paylines', () => {
    expect(getSlotMachinePresentation()).toEqual({ showPaylines: false })
  })
})

describe('password change validation', () => {
  it('requires a valid different password and matching confirmation', () => {
    expect(validatePasswordChange('abc123', 'abc123', 'abc123')).toBe('新密码不能与当前密码相同')
    expect(validatePasswordChange('abc123', 'meal_2026', 'meal_2025')).toBe('两次输入的新密码不一致')
    expect(validatePasswordChange('abc123', 'meal_2026', 'meal_2026')).toBeNull()
  })
})

describe('filterFoodOptions', () => {
  const foods = [
    { id: '1', name: '香辣牛肉面', category: '面食', tags: ['主食', '肉类', '辛辣'] },
    { id: '2', name: '清汤牛肉面', category: '面食', tags: ['主食', '肉类', '清淡'] },
    { id: '3', name: '鸡腿饭', category: '米饭', tags: ['主食', '肉类'] },
  ]

  it('combines name category and multi-tag filters with AND semantics', () => {
    expect(filterFoodOptions(foods, {
      query: '牛肉',
      category: '面食',
      tags: ['肉类', '清淡'],
    }).map((food) => food.id)).toEqual(['2'])
  })
})

describe('filterDietRecords', () => {
  const records = [
    { id: '1', businessDate: '2026-08-08', mealType: 'LUNCH', category: '面食', source: 'SLOT' },
    { id: '2', businessDate: '2026-08-07', mealType: 'DINNER', category: '米饭', source: 'MANUAL' },
    { id: '3', businessDate: '2026-07-31', mealType: 'LUNCH', category: '面食', source: 'MANUAL' },
  ]

  it('filters inclusively by date meal category and source', () => {
    expect(filterDietRecords(records, {
      startDate: '2026-08-01',
      endDate: '2026-08-08',
      mealType: 'LUNCH',
      category: '面食',
      source: 'SLOT',
    }).map((record) => record.id)).toEqual(['1'])
  })
})

describe('record filter drafts', () => {
  it('keeps the active results unchanged until a draft is explicitly confirmed', () => {
    const active = { startDate: '2026-08-01', endDate: '2026-08-31', source: '' }
    const draft = cloneDietFilter(active)
    draft.source = 'SLOT'

    expect(active.source).toBe('')
    expect(draft).toEqual({ startDate: '2026-08-01', endDate: '2026-08-31', source: 'SLOT' })
  })
})

describe('slot result flow', () => {
  it('supports closing an accidental spin and returning from confirmation', () => {
    expect(nextSlotStage('IDLE', 'START')).toBe('SPINNING')
    expect(nextSlotStage('SPINNING', 'REVEAL')).toBe('RESULT')
    expect(nextSlotStage('RESULT', 'CLOSE')).toBe('IDLE')
    expect(nextSlotStage('RESULT', 'CONFIRM_CHOICE')).toBe('CONFIRM')
    expect(nextSlotStage('CONFIRM', 'BACK')).toBe('RESULT')
  })
})

describe('slot overlay navigation visibility', () => {
  it('hides the tab bar while a result sheet is open', () => {
    expect(shouldHideTabBar('IDLE')).toBe(false)
    expect(shouldHideTabBar('SPINNING')).toBe(false)
    expect(shouldHideTabBar('RESULT')).toBe(true)
    expect(shouldHideTabBar('CONFIRM')).toBe(true)
    expect(shouldHideTabBar('SUCCESS')).toBe(true)
  })
})

describe('form validation', () => {
  it('enforces the PRD food limits', () => {
    expect(validateFoodOption({ name: '', category: '米饭', defaultPrice: '18.00', tags: [] })).toBe('请输入1～10个字符的食物名称')
    expect(validateFoodOption({ name: '鸡腿饭', category: '米饭', defaultPrice: '18.123', tags: [] })).toBe('请输入0～100000之间、最多两位小数的价格')
    expect(validateFoodOption({ name: '鸡腿饭', category: '米饭', defaultPrice: '18.00', tags: ['这是一个超过二十个字符长度限制的自定义食物标签文字'] })).toBe('单个标签不能超过20个字符')
  })

  it('rejects negative prices and future meal times', () => {
    expect(validateDietEntry('-1', '2026-08-08T12:00:00+08:00', new Date('2026-08-08T13:00:00+08:00'))).toBe('请输入0～100000之间、最多两位小数的价格')
    expect(validateDietEntry('18.00', '2026-08-09T12:00:00+08:00', new Date('2026-08-08T13:00:00+08:00'))).toBe('用餐时间不能晚于当前时间')
  })
})
