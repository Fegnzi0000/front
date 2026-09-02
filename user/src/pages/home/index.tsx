import { Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'

import { foodGlyph, PageHeader } from '../../components/ui'
import { calculateBudgetOverview, calculateDietSummary, getBudgetPresentation, getShanghaiDateTime } from '../../domain/core'
import { api, type DietRecord, type Preferences, type User } from '../../services/api'
import { syncCustomTabBar } from '../../domain/tabbar'
import './index.scss'

export default function HomePage() {
  const [, refresh] = useState(0)
  const [user, setUser] = useState<User | null>(null)
  const [preferences, setPreferences] = useState<Preferences | null>(null)
  const [todayRecords, setTodayRecords] = useState<DietRecord[]>([])
  const today = getShanghaiDateTime().date
  const load = async () => { try { const [nextUser, nextPreferences, records] = await Promise.all([api.me(), api.preferences(), api.records({ startDate: today, endDate: today, size: 100 })]); setUser(nextUser); setPreferences(nextPreferences); setTodayRecords(records.items) } catch (error) { Taro.showToast({ title: error instanceof Error ? error.message : '加载失败', icon: 'none' }) } }
  useDidShow(() => { syncCustomTabBar(0); load(); refresh((value) => value + 1) })
  const summary = calculateDietSummary(todayRecords)
  const budget = calculateBudgetOverview(summary.totalSpent, preferences?.budgetEnabled ?? false, preferences?.dailyBudget ?? null)
  const budgetPresentation = getBudgetPresentation(budget)

  return <View className='page home-page'>
    <PageHeader back={false} title={`嗨，${user?.nickname ?? ''}`} subtitle='今天也要好好吃饭' />
    <View className={`budget-hero ${budget.exceeded ? 'budget-over' : ''}`} onClick={() => Taro.navigateTo({ url: '/pages/budget/index' })}>
      <View className='row'><Text className='budget-label'>{budgetPresentation.label}</Text><Text className='budget-edit'>调整 ›</Text></View>
      {budget.enabled ? <><Text className='budget-value'>{budgetPresentation.amountLabel ? `${budgetPresentation.amountLabel} ¥ ${budgetPresentation.amount}` : `¥ ${budgetPresentation.amount}`}</Text><View className='budget-track'><View className='budget-progress' style={`width:${budget.progress}%`} /></View><View className='row budget-meta'><Text>已记录 ¥{budget.spent}</Text><Text>预算 ¥{budget.budget}</Text></View></> : <><Text className='budget-value budget-empty'>暂未设置</Text><Text className='muted block'>点击设置每日预算，首页会显示花费进度</Text></>}
    </View>
    <View className='row history-head'><View><Text className='section-title'>今日饮食记录</Text><Text className='section-caption'>{todayRecords.length} 餐 · 合计 ¥{summary.totalSpent}</Text></View><Text className='text-link' onClick={() => Taro.switchTab({ url: '/pages/history/index' })}>全部记录 ›</Text></View>
    {todayRecords.map((record) => <View className='record-row card' key={record.id} onClick={() => Taro.navigateTo({ url: `/pages/diet/edit/index?id=${record.id}` })}><View className='food-mark'>{foodGlyph(record.category ?? '其他')}</View><View className='record-copy'><Text className='record-name'>{record.foodName}</Text><Text className='action-note'>{record.eatenAt.slice(11, 16)} · {record.source === 'SLOT' ? '老虎机' : '手动记录'}</Text></View><Text className='price'>¥{record.actualPrice}</Text></View>)}
    {todayRecords.length === 0 && <View className='card empty home-empty'><Text className='action-title'>今天还没有饮食记录</Text><Text className='action-note'>可从底部“记录”进入并手动记录一餐</Text></View>}
  </View>
}
