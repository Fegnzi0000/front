import { Button, Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useState } from 'react'

import { resolveAuthenticatedRoute } from '../../domain/core'
import { api, ApiError, isLoggedIn } from '../../services/api'
import './index.scss'

const minimumLoadingTime = 350

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds))
}

export default function Index() {
  const [message, setMessage] = useState('正在准备今天的干饭选择…')
  const [retryVisible, setRetryVisible] = useState(false)

  const start = async () => {
    const startedAt = Date.now()
    setRetryVisible(false)
    setMessage('正在准备今天的干饭选择…')
    if (!isLoggedIn()) {
      await wait(minimumLoadingTime)
      await Taro.reLaunch({ url: '/pages/auth/login/index' })
      return
    }
    try {
      const user = await api.me()
      await wait(Math.max(0, minimumLoadingTime - (Date.now() - startedAt)))
      const targetRoute = resolveAuthenticatedRoute(user)
      if (!targetRoute) {
        await api.logout().catch(() => undefined)
        await Taro.reLaunch({ url: '/pages/auth/login/index' })
        return
      }
      await Taro.reLaunch({ url: targetRoute })
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 401) return
      setMessage('网络有点慢，请检查连接后重试')
      setRetryVisible(true)
    }
  }

  useLoad(() => { start() })

  return (
    <View className='launch-page'>
      <View className='launch-orb'>🍚</View>
      <Text className='launch-title'>是啊，吃什么？</Text>
      <Text className='launch-message'>{message}</Text>
      {!retryVisible && <View className='launch-loader'><View /><View /><View /></View>}
      {retryVisible && <Button className='launch-retry' onClick={start}>重试</Button>}
    </View>
  )
}
