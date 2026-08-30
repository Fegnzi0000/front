import { Button, Input, Picker, Switch, Text, View } from '@tarojs/components'
import Taro, { useLoad, useRouter } from '@tarojs/taro'
import { useState } from 'react'

import { PageHeader } from '../../../components/ui'
import { inferMealType, validateDietEntry, validateFoodOption } from '../../../domain/core'
import { api, type DietRecord, type FoodOption, type MealType } from '../../../services/api'
import './index.scss'

const meals: Array<{value:MealType;label:string;range:string}>=[{value:'BREAKFAST',label:'早餐',range:'05:00–10:00'},{value:'LUNCH',label:'午餐',range:'10:00–14:00'},{value:'AFTERNOON_TEA',label:'下午茶',range:'14:00–17:00'},{value:'DINNER',label:'晚餐',range:'17:00–22:00'},{value:'LATE_NIGHT',label:'宵夜',range:'22:00以后'}]
export default function DietEditPage(){
  const id=useRouter().params.id; const now=new Date().toISOString(); const [existing,setExisting]=useState<DietRecord | null>(null); const [foods,setFoods]=useState<FoodOption[]>([])
  const [mode,setMode]=useState<'POOL'|'MANUAL'>('MANUAL'); const [foodIndex,setFoodIndex]=useState(0)
  const [name,setName]=useState(''); const [category,setCategory]=useState('其他'); const [tags,setTags]=useState(''); const [price,setPrice]=useState(''); const [mealType,setMealType]=useState<MealType>(inferMealType(new Date().getHours())); const [date,setDate]=useState(now.slice(0,10)); const [time,setTime]=useState(now.slice(11,16)); const [addToPool,setAddToPool]=useState(false); const [error,setError]=useState('')
  useLoad(async()=>{try{const [foodPage,record]=await Promise.all([api.foods({size:100}),id?api.records({size:100}):Promise.resolve(null)]);setFoods(foodPage.items);const found=record?.items.find((item)=>item.id===id)??null;if(found){setExisting(found);setMode(found.foodOptionId?'POOL':'MANUAL');setName(found.foodName);setCategory(found.category??'其他');setTags(found.tags.join('、'));setPrice(found.actualPrice);setMealType(found.mealType);setDate(found.businessDate);setTime(found.eatenAt.slice(11,16));const index=foodPage.items.findIndex((food)=>food.id===found.foodOptionId);setFoodIndex(Math.max(0,index))}}catch(reason){setError(reason instanceof Error?reason.message:'加载失败')}})
  const chooseFood=(index:number)=>{setFoodIndex(index);setPrice(foods[index]?.defaultPrice??price)}
  const save=async()=>{
    const eatenAt=`${date}T${time}:00+08:00`; const dietError=validateDietEntry(price,eatenAt); if(dietError)return setError(dietError)
    try{
      const manual={name:name.trim(),category:category.trim()||'其他',tags:tags.split(/[、,，]/).map((item)=>item.trim()).filter(Boolean),defaultPrice:price}; if(mode==='MANUAL'){const foodError=validateFoodOption(manual);if(foodError)return setError(foodError)}
      if(existing) await api.updateRecord(existing.id,mode==='POOL'?{foodOptionId:foods[foodIndex]?.id,actualPrice:price,mealType,eatenAt}:{manualFood:{name:manual.name,category:manual.category,tags:manual.tags},actualPrice:price,mealType,eatenAt})
      else if(mode==='POOL'){const food=foods[foodIndex];if(!food)return setError('请选择食物池中的食物');await api.createRecord({foodOptionId:food.id,actualPrice:price,mealType,eatenAt})}
      else await api.createRecord({manualFood:{name:manual.name,category:manual.category,tags:manual.tags},addToFoodPool:addToPool,actualPrice:price,mealType,eatenAt})
      Taro.showToast({title:existing?'记录已更新':'记录好了',icon:'success'});setTimeout(()=>Taro.navigateBack(),350)
    }catch(reason){setError(reason instanceof Error?reason.message:'保存失败，请重试')}
  }
  const remove=async()=>{if(!existing)return;const result=await Taro.showModal({title:'删除这条记录？',content:'删除后会立即从消费统计中移除。',confirmText:'删除',confirmColor:'#BA1A1A'});if(result.confirm){try{await api.deleteRecord(existing.id);Taro.navigateBack()}catch(reason){setError(reason instanceof Error?reason.message:'删除失败')}}}
  return <View className='page page-secondary diet-edit-page'><PageHeader back title={existing?'编辑饮食记录':'手动记录一餐'} subtitle='这是独立入口，不需要先经过老虎机' />
    <View className='mode-tabs'><Text className={mode==='POOL'?'active':''} onClick={()=>setMode('POOL')}>从食物池选择</Text><Text className={mode==='MANUAL'?'active':''} onClick={()=>setMode('MANUAL')}>自由输入</Text></View>
    <View className='card diet-form'><Text className='form-section'>食物</Text>{mode==='POOL'?<>{foods.length>0?<Picker mode='selector' range={foods.map((food)=>`${food.name} · ¥${food.defaultPrice}`)} value={foodIndex} onChange={(e)=>chooseFood(Number(e.detail.value))}><View className='selector-box'><Text>{foods[foodIndex]?.name}</Text><Text>选择 ›</Text></View></Picker>:<Button className='secondary-button' onClick={()=>Taro.navigateTo({url:'/pages/foods/edit/index'})}>食物池为空，先添加食物</Button>}</>:<><View className='field'><Text className='label'>食物名称 *</Text><Input className='input' maxlength={10} value={name} placeholder='例如：自带便当' onInput={(e)=>setName(e.detail.value)} /></View><View className='field'><Text className='label'>分类 *</Text><Input className='input' maxlength={10} value={category??''} onInput={(e)=>setCategory(e.detail.value)} /></View><View className='field'><Text className='label'>标签（可选）</Text><Input className='input' value={tags} placeholder='用逗号或顿号分隔' onInput={(e)=>setTags(e.detail.value)} /></View><View className='switch-row row'><View><Text className='label'>同时加入食物池</Text><Text className='action-note'>以后可以被老虎机抽到</Text></View><Switch checked={addToPool} color='#A94700' onChange={(e)=>setAddToPool(e.detail.value)} /></View></>}
      <View className='divider' /><Text className='form-section'>日期与餐次</Text><View className='date-row'><Picker mode='date' value={date} end={now.slice(0,10)} onChange={(e)=>setDate(String(e.detail.value))}><View className='picker-box'><Text className='label'>日期</Text><Text>{date}</Text></View></Picker><Picker mode='time' value={time} onChange={(e)=>setTime(String(e.detail.value))}><View className='picker-box'><Text className='label'>时间</Text><Text>{time}</Text></View></Picker></View><View className='chips meal-options'>{meals.map((meal)=><View key={meal.value} className={`meal-option ${mealType===meal.value?'active':''}`} onClick={()=>setMealType(meal.value)}><Text>{meal.label}</Text><Text>{meal.range}</Text></View>)}</View>
      <View className='divider' /><Text className='form-section'>实际花费</Text><View className='money-input'><Text>¥</Text><Input type='digit' value={price} placeholder='0.00' onInput={(e)=>setPrice(e.detail.value)} /></View>{error&&<Text className='error'>{error}</Text>}
    </View><Button className='primary-button' onClick={save}>{existing?'保存修改':'确认记录'}</Button>{existing&&<Button className='danger-button' onClick={remove}>删除这条记录</Button>}
  </View>
}
