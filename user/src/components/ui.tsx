import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useRef } from 'react'
import type { PropsWithChildren } from 'react'

import { calculateHeaderOffset, shouldShowPageBack } from '../domain/core'

interface HeaderProps {
  title: string
  subtitle?: string
  back?: boolean
  rightLabel?: string
  onRight?: () => void
}

export function PageHeader({ title, subtitle, back, rightLabel, onRight }: HeaderProps) {
  const leaving = useRef(false)
  let headerOffset = 56
  let showBack = back ?? false
  try {
    const windowInfo = Taro.getWindowInfo()
    const capsule = Taro.getMenuButtonBoundingClientRect()
    headerOffset = calculateHeaderOffset(windowInfo.statusBarHeight ?? 0, capsule.bottom ?? 0)
    const pages = Taro.getCurrentPages()
    showBack = back ?? shouldShowPageBack(pages[pages.length - 1]?.route ?? '')
  } catch {
    // Keep a safe fallback for tests and non-WeChat previews.
  }
  const goBack = () => {
    if (leaving.current) return
    leaving.current = true
    const leave = () => {
      if (Taro.getCurrentPages().length > 1) Taro.navigateBack()
      else Taro.switchTab({ url: '/pages/home/index' })
    }
    // 表单页焦点仍在输入框时先收起软键盘，避免键盘与页面转场同时发生造成闪烁。
    Taro.hideKeyboard({ complete: leave })
  }
  return <View className='topbar' style={`padding-top:${headerOffset}px`}>
    {showBack ? <View className='topbar-back' onClick={goBack}>‹</View> : <View className='topbar-brand'>饭</View>}
    <View className='topbar-center'>
      <Text className='topbar-title'>{title}</Text>
      {subtitle && <Text className='topbar-subtitle'>{subtitle}</Text>}
    </View>
    {rightLabel ? <View className='topbar-action' onClick={onRight}>{rightLabel}</View> : <View className='topbar-spacer' />}
  </View>
}

export function ActionTile({ icon, title, note, onClick }: { icon: string; title: string; note: string; onClick: () => void }) {
  return <View className='card action-tile' onClick={onClick}>
    <View className='action-icon'>{icon}</View>
    <View className='action-copy'><Text className='action-title'>{title}</Text><Text className='action-note'>{note}</Text></View>
    <Text className='action-arrow'>›</Text>
  </View>
}

export function AiPreviewCard() {
  return <View className='card ai-preview action-tile' onClick={() => Taro.navigateTo({ url: '/pages/ai/preview/index' })}>
    <View className='action-icon'>AI</View>
    <View className='action-copy'>
      <View className='row-start'><Text className='action-title'>让搭子帮我推荐</Text><Text className='ai-badge'>第二阶段</Text></View>
      <Text className='action-note'>组件预览已开放，当前不会调用 AI</Text>
    </View>
    <Text className='action-arrow'>›</Text>
  </View>
}

export function EmptyState({ title, note, children }: PropsWithChildren<{ title: string; note: string }>) {
  return <View className='card empty'><Text className='action-title'>{title}</Text><Text className='action-note'>{note}</Text>{children}</View>
}

export function foodGlyph(category?: string | null): string {
  const map: Record<string, string> = { 米饭: '饭', 面食: '面', 粉类: '粉', 快餐: '堡', 小吃: '点', 轻食: '蔬', 汤粥: '汤' }
  return map[category ?? ''] ?? '餐'
}
