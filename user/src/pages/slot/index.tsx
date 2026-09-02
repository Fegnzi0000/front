import { Button, Input, Picker, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useEffect, useRef, useState } from 'react'

import { EmptyState, foodGlyph, PageHeader } from '../../components/ui'
import {
  buildSlotReels,
  getSlotMachinePresentation,
  getSlotReelStopDelays,
  getSlotRevealDelay,
  getSlotSoundCommand,
  inferMealType,
  getShanghaiDateTime,
  nextSlotStage,
  shouldHideTabBar,
  type MealType,
  type SlotStage,
  validateDietEntry,
} from '../../domain/core'
import { api, type FoodOption, type SlotSpin } from '../../services/api'
import { setCustomTabBarHidden, syncCustomTabBar } from '../../domain/tabbar'
import './index.scss'

interface SpinView { id: string; food: FoodOption }

const slotSpinSound = '/assets/audio/slot-spin.wav'

const meals: Array<{ value: MealType; label: string }> = [
  { value: 'BREAKFAST', label: '早餐' },
  { value: 'LUNCH', label: '午餐' },
  { value: 'AFTERNOON_TEA', label: '下午茶' },
  { value: 'DINNER', label: '晚餐' },
  { value: 'LATE_NIGHT', label: '宵夜' },
]

export default function SlotPage() {
  const [, refresh] = useState(0)
  const [foods, setFoods] = useState<FoodOption[]>([])
  const [stage, setStage] = useState<SlotStage>('IDLE')
  const [spin, setSpin] = useState<SpinView | null>(null)
  const [price, setPrice] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const audio = useRef<ReturnType<typeof Taro.createInnerAudioContext> | null>(null)
  const initialNow = getShanghaiDateTime()
  const [date, setDate] = useState(initialNow.date)
  const [time, setTime] = useState(initialNow.time)
  const [mealType, setMealType] = useState<MealType>(inferMealType(initialNow.hour))
  const [soundEnabled, setSoundEnabled] = useState(Boolean(Taro.getStorageSync('ai-ganfan.sound')))
  const { showPaylines } = getSlotMachinePresentation()
  const stopDelays = getSlotReelStopDelays()

  useDidShow(() => { syncCustomTabBar(2); setSoundEnabled(Boolean(Taro.getStorageSync('ai-ganfan.sound'))); api.foods({ size: 100 }).then((page) => setFoods(page.items)).catch(() => setFoods([])); refresh((value) => value + 1) })
  useEffect(() => {
    const hidden = shouldHideTabBar(stage)
    setCustomTabBarHidden(hidden)
    const tabBarTask = hidden ? Taro.hideTabBar({ animation: true }) : Taro.showTabBar({ animation: true })
    tabBarTask.catch(() => undefined)
  }, [stage])
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
    audio.current?.stop()
    audio.current?.destroy()
    audio.current = null
    setCustomTabBarHidden(false)
    Taro.showTabBar({ animation: false }).catch(() => undefined)
  }, [])

  const move = (event: Parameters<typeof nextSlotStage>[1]) => setStage((current) => nextSlotStage(current, event))
  const updateSlotSound = (event: Parameters<typeof nextSlotStage>[1]) => {
    const command = getSlotSoundCommand(soundEnabled, event)
    if (command === 'NONE') return
    if (command === 'STOP') {
      audio.current?.stop()
      return
    }
    if (!audio.current) {
      const nextAudio = Taro.createInnerAudioContext()
      nextAudio.src = slotSpinSound
      nextAudio.loop = false
      nextAudio.volume = 0.58
      nextAudio.obeyMuteSwitch = true
      audio.current = nextAudio
    }
    audio.current.stop()
    audio.current.play()
  }
  const start = async (reroll = false) => {
    if (!reroll && stage !== 'IDLE') return
    try {
      const next: SlotSpin = await api.createSpin(reroll ? spin?.id : undefined)
      const nextSpin = { id: next.spinId, food: { id: next.selectedFood.foodOptionId, name: next.selectedFood.name, category: next.selectedFood.category ?? '其他', defaultPrice: next.selectedFood.defaultPrice, tags: next.selectedFood.tags, source: 'DEFAULT' as const } }
      setSpin(nextSpin)
      setPrice(next.selectedFood.defaultPrice)
      const spinEvent = reroll ? 'REROLL' : 'START'
      move(spinEvent)
      updateSlotSound(spinEvent)
      Taro.vibrateShort({ type: 'light' }).catch(() => undefined)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        move('REVEAL')
        updateSlotSound('REVEAL')
        Taro.vibrateShort({ type: 'medium' }).catch(() => undefined)
      }, getSlotRevealDelay())
    } catch (error) {
      const code = error instanceof Error ? error.message : ''
      Taro.showToast({ title: code.includes('食物池为空') ? '请先添加食物' : code || '老虎机暂不可用', icon: 'none' })
    }
  }
  const close = () => {
    if (timer.current) clearTimeout(timer.current)
    updateSlotSound('CLOSE')
    move('CLOSE')
    setSpin(null)
  }
  const save = async () => {
    if (!spin) return
    const eatenAt = `${date}T${time}:00+08:00`
    const error = validateDietEntry(price, eatenAt)
    if (error) return Taro.showToast({ title: error, icon: 'none' })
    try { await api.confirmSpin(spin.id, { actualPrice: price, mealType, eatenAt }) } catch (reason) { return Taro.showToast({ title: reason instanceof Error ? reason.message : '确认失败', icon: 'none' }) }
    move('SAVE')
    timer.current = setTimeout(() => {
      move('RESET')
      setSpin(null)
      refresh((value) => value + 1)
    }, 700)
  }

  const result = spin?.food ?? foods[0]
  const reels = result ? buildSlotReels(foods, result) : []
  return <View className='page slot-page'>
    <PageHeader back={false} title='老虎机开饭' subtitle='点击按钮，看看这一餐吃什么' rightLabel='食物池' onRight={() => Taro.switchTab({ url: '/pages/foods/index' })} />
    {foods.length === 0 ? <EmptyState title='老虎机里还没有食物' note='先添加至少一个备选，再回来转动'>
      <Button className='primary-button' onClick={() => Taro.switchTab({ url: '/pages/foods/index' })}>去添加食物</Button>
    </EmptyState> : <>
      <View className={`slot-machine ${stage === 'SPINNING' ? 'machine-running' : ''}`}>
        <View className='reels'>{[0, 1, 2].map((column) => <View className='reel-window' key={column}>
          {stage === 'SPINNING' ? <View className='reel-track' style={{ animationDuration: `${stopDelays[column]}ms` }}>
            {reels[column].map((food, index) => <View className='reel-cell' key={`${food.id}-${index}`}>{column === 0 ? <><Text className='reel-glyph'>{foodGlyph(food.category)}</Text><Text className='reel-secondary'>{food.category}</Text></> : column === 1 ? <Text className='reel-food-name'>{food.name}</Text> : <><Text className='reel-price'>¥{food.defaultPrice}</Text><Text className='reel-secondary'>参考价</Text></>}</View>)}
          </View> : <View className='reel-result'>{column === 0 ? <><Text className='reel-glyph'>{foodGlyph(result?.category)}</Text><Text className='reel-secondary'>{result?.category ?? '分类'}</Text></> : column === 1 ? <Text className='reel-food-name'>{result?.name ?? '点击开始'}</Text> : <><Text className='reel-price'>¥{result?.defaultPrice ?? '--'}</Text><Text className='reel-secondary'>参考价</Text></>}</View>}
        </View>)}</View>
        {showPaylines && <><View className='payline payline-top' /><View className='payline payline-bottom' /></>}
        <View className='machine-console'><View className='status-led' /><Text>{stage === 'SPINNING' ? '正在选择…' : stage === 'IDLE' ? '点击按钮开始' : '结果已揭晓'}</Text></View>
        <Button className='machine-start-button' disabled={stage !== 'IDLE'} onClick={() => start(false)}>{stage === 'SPINNING' ? '选择中…' : '开始选择'}</Button>
      </View>
    </>}

    {(stage === 'RESULT' || stage === 'CONFIRM' || stage === 'SUCCESS') && spin && <View className='sheet-mask'><View className={`sheet ${stage === 'CONFIRM' ? 'confirm-sheet' : ''}`}><View className='sheet-handle' />
      {stage === 'RESULT' && <><View className='row'><View><Text className='result-kicker'>本次抽中</Text><Text className='result-title'>{spin.food.name}</Text></View><View className='sheet-close' onClick={close}>×</View></View><View className='result-symbol'>{foodGlyph(spin.food.category)}</View><View className='chips result-tags'><Text className='chip chip-active'>{spin.food.category}</Text>{spin.food.tags.map((tag) => <Text className='chip' key={tag}>{tag}</Text>)}</View><View className='reference-price'><Text>参考价格</Text><Text className='price'>¥{spin.food.defaultPrice}</Text></View><Button className='primary-button' onClick={() => move('CONFIRM_CHOICE')}>就吃这个</Button><Button className='secondary-button' disabled={foods.length < 2} onClick={() => start(true)}>再转一次</Button><Text className='cancel-link' onClick={close}>不想选了，关闭结果</Text></>}
      {stage === 'CONFIRM' && <><View className='row'><View className='topbar-back' onClick={() => move('BACK')}>‹</View><Text className='sheet-title'>确认饮食记录</Text><View className='sheet-close' onClick={close}>×</View></View><Text className='confirm-food'>{spin.food.name}</Text><Text className='label'>餐次</Text><View className='chips meal-chips'>{meals.map((meal) => <Text key={meal.value} className={`chip ${mealType === meal.value ? 'chip-active' : ''}`} onClick={() => setMealType(meal.value)}>{meal.label}</Text>)}</View><View className='field'><Text className='label'>实际花费</Text><Input className='input' type='digit' value={price} onInput={(event) => setPrice(event.detail.value)} /></View><View className='date-row'><Picker mode='date' value={date} end={initialNow.date} onChange={(event) => setDate(String(event.detail.value))}><View className='picker-box'><Text className='label'>日期</Text><Text>{date}</Text></View></Picker><Picker mode='time' value={time} onChange={(event) => setTime(String(event.detail.value))}><View className='picker-box'><Text className='label'>时间</Text><Text>{time}</Text></View></Picker></View><Button className='primary-button' onClick={save}>确认记录</Button></>}
      {stage === 'SUCCESS' && <View className='success-state'><View className='success-check'>✓</View><Text className='result-title'>记录好了</Text><Text className='muted'>祝你吃得开心，也吃得明白</Text></View>}
    </View></View>}
  </View>
}
