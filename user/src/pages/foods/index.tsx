import { Button, Input, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useMemo, useState } from 'react'

import { EmptyState, foodGlyph, PageHeader } from '../../components/ui'
import { api, type FoodOption } from '../../services/api'
import { syncCustomTabBar } from '../../domain/tabbar'
import './index.scss'

export default function FoodsPage() {
  const [foods, setFoods] = useState<FoodOption[]>([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const load = async () => { try { setFoods((await api.foods({ size: 100 })).items) } catch (error) { Taro.showToast({ title: error instanceof Error ? error.message : '加载食物池失败', icon: 'none' }) } }
  useDidShow(() => { syncCustomTabBar(1); load() })
  const categories = useMemo(() => [...new Set(foods.map((food) => food.category))], [foods])
  const availableTags = useMemo(() => [...new Set(foods.flatMap((food) => food.tags))], [foods])
  const filteredFoods = useMemo(() => foods.filter((food) => (!query || food.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) && (!category || food.category === category) && tags.every((tag) => food.tags.includes(tag))), [foods, query, category, tags])
  const toggleTag = (tag: string) => setTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag])
  const clearFilters = () => { setQuery(''); setCategory(''); setTags([]) }
  const activeFilterCount = (query.trim() ? 1 : 0) + (category ? 1 : 0) + tags.length
  const remove = async (id: string, name: string) => {
    const result = await Taro.showModal({ title: '删除食物', content: `确定从食物池删除“${name}”吗？历史记录不会受到影响。`, confirmText: '删除', confirmColor: '#BA1A1A' })
    if (!result.confirm) return
    try { await api.deleteFood(id); await load() } catch (error) { Taro.showToast({ title: error instanceof Error ? error.message : '删除失败', icon: 'none' }) }
  }

  return <View className='page foods-page'>
    <PageHeader back={false} title='食物池' subtitle={`${foods.length} 个备选，可按分类和标签筛选`} />
    <View className='filter-card card'>
      <View className='filter-toggle' onClick={() => setFiltersOpen((open) => !open)}><View><Text className='filter-title'>筛选食物</Text><Text className='filter-summary'>{activeFilterCount > 0 ? `已启用 ${activeFilterCount} 项筛选` : '按名称、分类和标签筛选'}</Text></View><Text className='filter-arrow'>{filtersOpen ? '收起⌃' : '展开⌄'}</Text></View>
      {filtersOpen && <View className='filter-body'>
        <View className='search-box'><Text className='search-icon'>⌕</Text><Input className='search-input' placeholder='搜索食物名称' value={query} onInput={(event) => setQuery(event.detail.value)} /></View>
        <View className='row'><Text className='filter-label'>分类</Text>{activeFilterCount > 0 && <Text className='text-link' onClick={clearFilters}>清除筛选</Text>}</View>
        <View className='chips'><Text className={`chip ${category === '' ? 'chip-active' : ''}`} onClick={() => setCategory('')}>全部</Text>{categories.map((item) => <Text key={item} className={`chip ${category === item ? 'chip-active' : ''}`} onClick={() => setCategory(item)}>{item}</Text>)}</View>
        <View className='row tag-heading'><Text className='filter-label'>标签（可多选）</Text><Text className='text-link' onClick={() => Taro.navigateTo({ url: '/pages/tags/index' })}>管理标签 ›</Text></View>
        <View className='chips'><Text className={`chip ${tags.length === 0 ? 'chip-active' : ''}`} onClick={() => setTags([])}>全部标签</Text>{availableTags.map((tag) => <Text key={tag} className={`chip ${tags.includes(tag) ? 'chip-active' : ''}`} onClick={() => toggleTag(tag)}>{tags.includes(tag) ? '✓ ' : ''}{tag}</Text>)}</View>
        <Text className='filter-result'>当前显示 {filteredFoods.length} / {foods.length} 个食物</Text>
      </View>}
    </View>
    <View className='food-list'>{filteredFoods.map((food) => <View className='food-card card' key={food.id}>
      <View className='food-avatar'>{foodGlyph(food.category)}</View>
      <View className='food-content'><View className='row'><Text className='food-name'>{food.name}</Text><Text className='food-price'>¥{food.defaultPrice}</Text></View><Text className='food-category'>{food.category} · {food.source === 'DEFAULT' ? '默认食物' : '自定义'}</Text><View className='chips food-tags'>{food.tags.map((tag) => <Text className='mini-tag' key={tag}>{tag}</Text>)}</View><View className='food-buttons'><Button className='mini-button edit-food' onClick={() => Taro.navigateTo({ url: `/pages/foods/edit/index?id=${food.id}` })}>修改</Button><Button className='mini-button delete-food' onClick={() => remove(food.id, food.name)}>删除</Button></View></View>
    </View>)}</View>
    {filteredFoods.length === 0 && <EmptyState title={foods.length === 0 ? '食物池还是空的' : '没有符合条件的食物'} note={foods.length === 0 ? '添加第一项后，老虎机才能开始工作' : '请修改分类或标签筛选条件'}>{foods.length > 0 && <Button className='primary-button' onClick={clearFilters}>清除筛选</Button>}</EmptyState>}
    <Button className='add-food-button' onClick={() => Taro.navigateTo({ url: '/pages/foods/edit/index' })}>添加新食物</Button>
  </View>
}
