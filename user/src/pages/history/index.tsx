import { Button, Picker, Text, View } from '@tarojs/components'
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { EmptyState, foodGlyph, PageHeader } from '../../components/ui'
import {
  buildWeeklySpendingSeries,
  cloneDietFilter,
  getCurrentWeekRange,
  getHistoryStatisticsRanges,
  getRecordCountPresentation,
  type DietFilter,
} from '../../domain/core'
import { api, type DietRecord, type MealType } from '../../services/api'
import { syncCustomTabBar } from '../../domain/tabbar'
import './index.scss'

const mealLabels: Record<MealType, string> = { BREAKFAST: '早餐', LUNCH: '午餐', AFTERNOON_TEA: '下午茶', DINNER: '晚餐', LATE_NIGHT: '宵夜' }

type StatisticsData = {
  totalSpent: string
  recordCount: number
  recordedDays: number
  averageDailySpent: string
  spendingSeries: Array<{ period: string; totalSpent: string }>
  categoryDistribution: Array<{ category: string; totalSpent: string; recordCount: number }>
}

function emptyStatistics(): StatisticsData {
  return { totalSpent: '0.00', recordCount: 0, recordedDays: 0, averageDailySpent: '0.00', spendingSeries: [], categoryDistribution: [] }
}

function monthRange() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const last = new Date(year, now.getMonth() + 1, 0).getDate()
  return { start: `${year}-${month}-01`, end: `${year}-${month}-${last}` }
}

function WeeklyTrendChart({ points }: { points: Array<{ period: string; label: string; totalSpent: string }> }) {
  const values = points.map((point) => Number(point.totalSpent))
  const maximum = Math.max(...values, 0)
  return <View className='weekly-chart'>
    {points.map((point) => {
      const value = Number(point.totalSpent)
      const height = maximum === 0 || value === 0 ? 0 : Math.max(8, value / maximum * 100)
      return <View className='weekly-column' key={point.period}>
        <Text className='weekly-value'>¥{point.totalSpent}</Text>
        <View className='weekly-track'><View className='weekly-fill' style={`height:${height}%`} /></View>
        <Text className='weekly-label'>{point.label}</Text>
      </View>
    })}
  </View>
}

export default function HistoryPage() {
  const range = monthRange()
  const createDefaultFilters = (): DietFilter => ({ startDate: range.start, endDate: range.end, mealType: '', category: '', source: '' })
  const [, refresh] = useState(0)
  const [records, setRecords] = useState<DietRecord[]>([])
  const [recordTotal, setRecordTotal] = useState(0)
  const [overviewStatistics, setOverviewStatistics] = useState<StatisticsData>(emptyStatistics)
  const [weeklyStatistics, setWeeklyStatistics] = useState<StatisticsData>(emptyStatistics)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [appliedFilters, setAppliedFilters] = useState<DietFilter>(createDefaultFilters)
  const [draftFilters, setDraftFilters] = useState<DietFilter>(createDefaultFilters)
  const [overviewRange, setOverviewRange] = useState(monthRange)
  const [overviewDraftRange, setOverviewDraftRange] = useState(monthRange)
  const [trendRange, setTrendRange] = useState(getCurrentWeekRange)
  const startDate = appliedFilters.startDate ?? range.start
  const endDate = appliedFilters.endDate ?? range.end
  const draftStartDate = draftFilters.startDate ?? range.start
  const draftEndDate = draftFilters.endDate ?? range.end

  const load = useCallback(async () => {
    const statisticsRanges = getHistoryStatisticsRanges(overviewRange.start, overviewRange.end)
    setTrendRange(statisticsRanges.weekly)
    try {
      const [recordPage, overviewStatistic, weeklyStatistic] = await Promise.all([
        api.records({ ...appliedFilters, page: 0, size: 100, mealType: (appliedFilters.mealType || undefined) as MealType | undefined, source: (appliedFilters.source || undefined) as 'MANUAL' | 'SLOT' | undefined }),
        api.statistics(statisticsRanges.overview.start, statisticsRanges.overview.end, 'DAY'),
        api.statistics(statisticsRanges.weekly.start, statisticsRanges.weekly.end, 'DAY'),
      ])
      setRecords(recordPage.items)
      setRecordTotal(recordPage.totalElements)
      setOverviewStatistics(overviewStatistic)
      setWeeklyStatistics(weeklyStatistic)
    } catch (reason) {
      Taro.showToast({ title: reason instanceof Error ? reason.message : '加载失败', icon: 'none' })
    }
  }, [appliedFilters, overviewRange])

  useDidShow(() => { syncCustomTabBar(3); load(); refresh((value) => value + 1) })
  useEffect(() => { load() }, [load])
  usePullDownRefresh(() => { load().finally(() => Taro.stopPullDownRefresh()); refresh((value) => value + 1) })

  const categories = useMemo(() => [...new Set(records.map((record) => record.category).filter(Boolean))] as string[], [records])
  const maxCategorySpent = Math.max(0, ...weeklyStatistics.categoryDistribution.map((item) => Number(item.totalSpent)))
  const weeklyPoints = buildWeeklySpendingSeries(weeklyStatistics.spendingSeries, trendRange.start)
  const extraFilterCount = [appliedFilters.mealType, appliedFilters.category, appliedFilters.source].filter(Boolean).length
  const recordCountPresentation = getRecordCountPresentation(recordTotal, records.length)

  const updateDraft = (patch: Partial<DietFilter>) => setDraftFilters((current) => ({ ...current, ...patch }))
  const openFilters = () => { setDraftFilters(cloneDietFilter(appliedFilters)); setFiltersOpen(true) }
  const confirmFilters = () => { setAppliedFilters(cloneDietFilter(draftFilters)); setFiltersOpen(false) }
  const resetDraft = () => setDraftFilters(createDefaultFilters())
  const confirmOverviewRange = () => setOverviewRange({ ...overviewDraftRange })

  return <View className='page history-page'>
    <PageHeader back={false} title='饮食记录' subtitle='统计消费，也管理每一餐' rightLabel='记一餐' onRight={() => Taro.navigateTo({ url: '/pages/diet/edit/index' })} />

    <View className='overview-filter card'>
      <View className='overview-filter-heading'><Text className='action-title'>统计概览</Text><Text className='action-note'>选择日期后，只更新下方四项指标</Text></View>
      <View className='date-filter-row overview-date-row'>
        <Picker mode='date' value={overviewDraftRange.start} end={overviewDraftRange.end} onChange={(event) => setOverviewDraftRange((current) => ({ ...current, start: String(event.detail.value) }))}><View className='filter-picker'>{overviewDraftRange.start}</View></Picker>
        <Text>至</Text>
        <Picker mode='date' value={overviewDraftRange.end} start={overviewDraftRange.start} onChange={(event) => setOverviewDraftRange((current) => ({ ...current, end: String(event.detail.value) }))}><View className='filter-picker'>{overviewDraftRange.end}</View></Picker>
      </View>
      <Button className='secondary-button overview-filter-button' onClick={confirmOverviewRange}>应用日期范围</Button>
      <Text className='statistics-scope'>当前统计：{overviewRange.start} 至 {overviewRange.end}</Text>
    </View>

    <View className='stats-grid'>
      <View className='stat card'><Text className='muted'>总消费</Text><Text className='stat-value'>¥{overviewStatistics.totalSpent}</Text></View>
      <View className='stat card'><Text className='muted'>记录数</Text><Text className='stat-value'>{overviewStatistics.recordCount} 餐</Text></View>
      <View className='stat card'><Text className='muted'>有记录天数</Text><Text className='stat-value'>{overviewStatistics.recordedDays} 天</Text></View>
      <View className='stat card'><Text className='muted'>日均消费</Text><Text className='stat-value'>¥{overviewStatistics.averageDailySpent}</Text></View>
    </View>

    <View className='weekly-analysis card'>
      <View className='statistics-heading'><Text className='action-title'>本周消费分析</Text><Text className='action-note'>{trendRange.start} 至 {trendRange.end} · 固定本周</Text></View>
      <View className='weekly-analysis-section'>
        <Text className='analysis-subtitle'>消费趋势</Text>
        <View className='trend-summary'><Text>最高 ¥{Math.max(0, ...weeklyPoints.map((item) => Number(item.totalSpent))).toFixed(2)}</Text><Text>合计 ¥{weeklyStatistics.totalSpent}</Text></View>
        <WeeklyTrendChart points={weeklyPoints} />
      </View>
      <View className='weekly-analysis-section category-section'>
        <View className='statistics-heading category-heading'><Text className='analysis-subtitle'>分类分布</Text><Text className='action-note'>同为本周数据</Text></View>
        {weeklyStatistics.categoryDistribution.map((item) => <View className='bar-item' key={item.category}><View className='bar-meta'><Text>{item.category} · {item.recordCount} 餐</Text><Text>¥{item.totalSpent}</Text></View><View className='bar-track'><View className='bar-fill category-bar' style={`width:${maxCategorySpent > 0 ? Math.max(4, Number(item.totalSpent) / maxCategorySpent * 100) : 0}%`} /></View></View>)}
        {weeklyStatistics.categoryDistribution.length === 0 && <Text className='statistics-empty'>本周暂无分类消费数据</Text>}
      </View>
    </View>

    <Text className='section-title record-section-title'>记录明细</Text>
    <View className='filter-toggle card' onClick={() => filtersOpen ? setFiltersOpen(false) : openFilters()}><View><Text className='action-title'>筛选最近记录</Text><Text className='action-note'>{startDate} 至 {endDate}{extraFilterCount ? ` · 另有 ${extraFilterCount} 个条件` : ''}</Text></View><Text className='filter-toggle-action'>{filtersOpen ? '收起' : '筛选'} {filtersOpen ? '⌃' : '⌄'}</Text></View>
    {filtersOpen && <View className='filter-panel card'>
      <View className='row'><Text className='action-title'>筛选条件</Text><Text className='text-link' onClick={resetDraft}>重置全部</Text></View>
      <Text className='label filter-label'>日期范围</Text><View className='date-filter-row'><Picker mode='date' value={draftStartDate} end={draftEndDate} onChange={(event) => updateDraft({ startDate: String(event.detail.value) })}><View className='filter-picker'>{draftStartDate}</View></Picker><Text>至</Text><Picker mode='date' value={draftEndDate} start={draftStartDate} onChange={(event) => updateDraft({ endDate: String(event.detail.value) })}><View className='filter-picker'>{draftEndDate}</View></Picker></View>
      <Text className='label filter-label'>餐次</Text><View className='chips'><Text className={`chip ${draftFilters.mealType === '' ? 'chip-active' : ''}`} onClick={() => updateDraft({ mealType: '' })}>全部</Text>{Object.entries(mealLabels).map(([key, label]) => <Text className={`chip ${draftFilters.mealType === key ? 'chip-active' : ''}`} key={key} onClick={() => updateDraft({ mealType: key })}>{label}</Text>)}</View>
      <Text className='label filter-label'>记录来源</Text><View className='chips'><Text className={`chip ${draftFilters.source === '' ? 'chip-active' : ''}`} onClick={() => updateDraft({ source: '' })}>全部</Text><Text className={`chip ${draftFilters.source === 'SLOT' ? 'chip-active' : ''}`} onClick={() => updateDraft({ source: 'SLOT' })}>老虎机</Text><Text className={`chip ${draftFilters.source === 'MANUAL' ? 'chip-active' : ''}`} onClick={() => updateDraft({ source: 'MANUAL' })}>手动记录</Text></View>
      {categories.length > 0 && <><Text className='label filter-label'>食物分类</Text><View className='chips'><Text className={`chip ${draftFilters.category === '' ? 'chip-active' : ''}`} onClick={() => updateDraft({ category: '' })}>全部</Text>{categories.map((item) => <Text className={`chip ${draftFilters.category === item ? 'chip-active' : ''}`} key={item} onClick={() => updateDraft({ category: item })}>{item}</Text>)}</View></>}
      <Button className='primary-button filter-confirm-button' onClick={confirmFilters}>确认筛选</Button>
    </View>}
    <View className='range-summary row'><Text>筛选结果</Text><Text className='muted'>{recordCountPresentation}</Text></View>
    {records.map((record) => <View className='history-card card' key={record.id} onClick={() => Taro.navigateTo({ url: `/pages/diet/edit/index?id=${record.id}` })}><View className='food-mark'>{foodGlyph(record.category ?? '其他')}</View><View className='history-copy'><Text className='record-name'>{record.foodName}</Text><Text className='action-note'>{record.businessDate} · {record.eatenAt.slice(11, 16)} · {mealLabels[record.mealType]}</Text><Text className='source-label'>{record.source === 'SLOT' ? '老虎机选择' : '手动记录'} · {record.category ?? '未分类'}</Text></View><View className='history-right'><Text className='price'>¥{record.actualPrice}</Text><Text className='edit-link'>编辑 ›</Text></View></View>)}
    {records.length === 0 && <EmptyState title='这个范围还没有记录' note='可以调整筛选条件，或点击右上角“记一餐”补记'><Button className='secondary-button' onClick={openFilters}>调整筛选条件</Button></EmptyState>}
  </View>
}
