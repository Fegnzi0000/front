import { Button, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'

import { ActionTile, PageHeader } from '../../components/ui'
import { getProfileFoodActions } from '../../domain/core'
import { api, type FoodOption, type Preferences, type User } from '../../services/api'
import { syncCustomTabBar } from '../../domain/tabbar'
import './index.scss'

export default function ProfilePage() {
  const [, refresh] = useState(0); const [user,setUser]=useState<User | null>(null);const [preferences,setPreferences]=useState<Preferences | null>(null);const [foods,setFoods]=useState<FoodOption[]>([])
  useDidShow(() => { syncCustomTabBar(4); Promise.all([api.me(),api.preferences(),api.foods({size:100})]).then(([nextUser,nextPreferences,page])=>{setUser(nextUser);setPreferences(nextPreferences);setFoods(page.items)}).catch((reason)=>Taro.showToast({title:reason instanceof Error?reason.message:'加载失败',icon:'none'}));refresh((value) => value + 1) })
  const preferenceCount = (preferences?.tastePreferences.length??0)+(preferences?.medicalAllergies.length??0)+(preferences?.dietaryRestrictions.length??0)+(preferences?.dislikes.length??0)
  const tags = [...new Set(foods.flatMap((food) => food.tags))]
  const logout = async () => {
    const result = await Taro.showModal({
      title: '退出登录？',
      content: '将撤销当前会话并回到登录页。',
      confirmText: '退出',
      confirmColor: '#BA1A1A',
    })
    if (!result.confirm) return
    try { await api.logout() } finally { await Taro.reLaunch({ url: '/pages/auth/login/index' }) }
  }

  return <View className='page profile-page'>
    <PageHeader back={false} title='我的' subtitle='所有个人功能都有明确入口' />
    <View className='profile-hero' onClick={() => Taro.navigateTo({ url: '/pages/profile/edit/index' })}><View className='profile-avatar'>饭</View><View className='profile-copy'><Text className='profile-name'>{user?.nickname??''}</Text><Text className='profile-email'>{user?.email??''}</Text><Text className='profile-edit'>编辑昵称 ›</Text></View></View>
    <Text className='group-title'>饮食设置</Text><View className='menu-stack'><ActionTile icon='¥' title='每日预算' note={preferences?.budgetEnabled ? `已设置 ¥${preferences.dailyBudget}/天` : '暂未启用预算'} onClick={() => Taro.navigateTo({ url: '/pages/budget/index' })} /><ActionTile icon='味' title='口味偏好与忌口' note={preferenceCount ? `已设置 ${preferenceCount} 项` : '过敏、忌口、不喜欢和口味偏好'} onClick={() => Taro.navigateTo({ url: '/pages/preferences/index' })} /></View>
    <View className='tag-manager-card card'><View className='row'><View><Text className='action-title'>标签管理</Text><Text className='action-note'>{tags.length} 个标签，可统一重命名或删除</Text></View><Text className='tag-manage-button' onClick={() => Taro.navigateTo({ url: '/pages/tags/index' })}>进入管理 ›</Text></View><View className='chips profile-tags'>{tags.slice(0, 8).map((tag) => <Text className='mini-tag' key={tag}>{tag}</Text>)}</View></View>
    <Text className='group-title'>食物管理</Text><View className='menu-stack'>{getProfileFoodActions().map((action) => <ActionTile key={action.title} icon={action.icon} title={action.title} note={`${foods.length} 个食物，${action.note}`} onClick={() => Taro.switchTab({ url: action.route })} />)}</View>
    <Text className='group-title'>账号与系统</Text><View className='menu-stack'><ActionTile icon='锁' title='账号与安全' note='删除头像、修改密码、注销账号' onClick={() => Taro.navigateTo({ url: '/pages/account/security/index' })} /><ActionTile icon='设' title='应用设置' note='老虎机音效、隐私与本地数据' onClick={() => Taro.navigateTo({ url: '/pages/settings/index' })} /><ActionTile icon='AI' title='AI 功能预览' note='第二阶段组件展示，不调用模型' onClick={() => Taro.navigateTo({ url: '/pages/ai/preview/index' })} /></View>
    <Button className='danger-button profile-logout' onClick={logout}>退出登录</Button>
  </View>
}
