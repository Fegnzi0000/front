import { Button, Input, Text, View } from '@tarojs/components'
import Taro, { useLoad, useRouter } from '@tarojs/taro'
import { useState } from 'react'

import { PageHeader } from '../../../components/ui'
import { validateFoodOption } from '../../../domain/core'
import { api, type FoodOption } from '../../../services/api'
import './index.scss'

const categories = ['米饭','面食','粉类','快餐','小吃','轻食','汤粥','其他']
export default function FoodEditPage() {
  const id = useRouter().params.id
  const [existing, setExisting] = useState<FoodOption | null>(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('米饭')
  const [price, setPrice] = useState('')
  const [tags, setTags] = useState('')
  const [error, setError] = useState('')
  useLoad(async () => { if (!id) return; try { const food = await api.food(id); setExisting(food); setName(food.name); setCategory(food.category); setPrice(food.defaultPrice); setTags(food.tags.join('、')) } catch (reason) { setError(reason instanceof Error ? reason.message : '加载食物失败') } })
  const save = async () => {
    const input = { name: name.trim(), category: category.trim(), defaultPrice: price.trim(), tags: tags.split(/[、,，]/).map((tag) => tag.trim()).filter(Boolean) }
    const validation = validateFoodOption(input)
    if (validation) return setError(validation)
    try {
      if (existing) await api.updateFood(existing.id, input); else await api.createFood(input)
      Taro.showToast({ title: existing ? '已更新' : '已添加', icon: 'success' }); setTimeout(() => Taro.navigateBack(), 350)
    } catch (reason) { setError(reason instanceof Error ? reason.message : '保存失败，请重试') }
  }
  return <View className='page page-secondary food-edit-page'><PageHeader back title={existing ? '编辑食物' : '添加新食物'} subtitle='名称和分类相同才会被视为重复' />
    <View className='card form-card'><View className='field'><Text className='label'>食物名称 *</Text><Input className='input' maxlength={10} placeholder='例如：黄焖鸡米饭' value={name} onInput={(event) => setName(event.detail.value)} /></View>
      <Text className='label'>分类 *</Text><View className='chips category-chips'>{categories.map((item) => <Text className={`chip ${category === item ? 'chip-active' : ''}`} key={item} onClick={() => setCategory(item)}>{item}</Text>)}</View>
      <View className='field custom-category'><Text className='label'>自定义分类</Text><Input className='input' maxlength={10} placeholder='也可以直接输入分类' value={categories.includes(category) ? '' : category} onInput={(event) => setCategory(event.detail.value)} /></View>
      <View className='field'><Text className='label'>默认价格 *</Text><Input className='input' type='digit' placeholder='0.00' value={price} onInput={(event) => setPrice(event.detail.value)} /></View>
      <View className='field'><Text className='label'>标签</Text><Input className='input' placeholder='用逗号或顿号分隔，例如：主食、肉类' value={tags} onInput={(event) => setTags(event.detail.value)} /><Text className='form-hint'>最多 50 个标签，单个不超过 20 个字符</Text></View>
      {error && <Text className='error'>{error}</Text>}</View><Button className='primary-button' onClick={save}>{existing ? '保存修改' : '添加到食物池'}</Button>
  </View>
}
