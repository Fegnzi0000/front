import { Button, Input, Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useState } from 'react'

import { getMiniProgramLoginFeedback, resolveLoginNextStep, validatePassword } from '../../../domain/core'
import { api } from '../../../services/api'
import './index.scss'

async function navigateAfterLogin(targetRoute: string) {
  if (targetRoute === '/pages/home/index') {
    await Taro.switchTab({ url: targetRoute })
    return
  }
  await Taro.reLaunch({ url: targetRoute })
}

/** 登录页：只调用正式认证接口，不保存或预填演示账号。 */
export default function LoginPage() {
  const [emailLoginVisible, setEmailLoginVisible] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useLoad((options) => {
    setNotice(getMiniProgramLoginFeedback(options.reason))
  })

  const login = async () => {
    const normalized = email.trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(normalized)) return setError('请输入有效邮箱')
    const passwordError = validatePassword(password)
    if (passwordError) return setError(passwordError)
    setSubmitting(true)
    setError('')
    setNotice('')
    try {
      const result = await api.login(normalized, password)
      const targetRoute = result.user.role === 'USER'
        ? resolveLoginNextStep(result.nextStep)
        : null
      if (!targetRoute) {
        await api.logout().catch(() => undefined)
        setError(getMiniProgramLoginFeedback(undefined, result.user.role))
        setSubmitting(false)
        return
      }
      await navigateAfterLogin(targetRoute)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '登录失败，请稍后重试')
      setSubmitting(false)
    }
  }

  const getWeChatCode = async () => {
    const response = await Taro.login()
    if (!response.code) throw new Error('未获取到微信登录凭证，请重试')
    return response.code
  }

  const weChatLogin = async () => {
    setSubmitting(true)
    setError('')
    setNotice('')
    try {
      const result = await api.weChatMiniProgramLogin(await getWeChatCode())
      const targetRoute = result.user.role === 'USER' ? resolveLoginNextStep(result.nextStep) : null
      if (!targetRoute) {
        await api.logout().catch(() => undefined)
        setError(getMiniProgramLoginFeedback(undefined, result.user.role))
        setSubmitting(false)
        return
      }
      await navigateAfterLogin(targetRoute)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '微信登录失败，请稍后重试')
      setSubmitting(false)
    }
  }

  const bindWeChat = async () => {
    const normalized = email.trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(normalized)) return setError('请输入有效邮箱')
    const passwordError = validatePassword(password)
    if (passwordError) return setError(passwordError)
    setSubmitting(true)
    setError('')
    try {
      const result = await api.bindWeChatMiniProgram(await getWeChatCode(), normalized, password)
      const targetRoute = result.user.role === 'USER' ? resolveLoginNextStep(result.nextStep) : null
      if (!targetRoute) {
        await api.logout().catch(() => undefined)
        setError(getMiniProgramLoginFeedback(undefined, result.user.role))
        setSubmitting(false)
        return
      }
      await navigateAfterLogin(targetRoute)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '微信绑定失败，请稍后重试')
      setSubmitting(false)
    }
  }

  return (
    <View className='login-page'>
      <View className='brand-orb'>🍚</View>
      <Text className='brand-name'>是啊，吃什么？</Text>
      <Text className='slogan'>今天吃什么，让它帮你拍板</Text>
      <View className='login-card'>
        {notice && <Text className='login-notice'>{notice}</Text>}
        <Button className='primary-button' loading={submitting} disabled={submitting} onClick={weChatLogin}>微信一键登录</Button>
        <Text className='wechat-note'>首次登录将创建账号并进入饮食偏好设置</Text>
        {emailLoginVisible && <>
          <View className='login-divider'><Text>或使用已有邮箱账号</Text></View>
          <View className='field'>
            <Text className='label'>邮箱</Text>
            <Input className='input' value={email} onInput={(event) => setEmail(event.detail.value)} placeholder='请输入邮箱' />
          </View>
          <View className='field'>
            <Text className='label'>密码</Text>
            <Input className='input' password value={password} onInput={(event) => setPassword(event.detail.value)} placeholder='6～20位字母、数字或下划线' />
          </View>
          <Button className='secondary-button' loading={submitting} disabled={submitting} onClick={login}>邮箱密码登录</Button>
          <Button className='link-button' loading={submitting} disabled={submitting} onClick={bindWeChat}>绑定微信并登录</Button>
        </>}
        {error && <Text className='error'>{error}</Text>}
        <View className='login-links'>
          <Text onClick={() => setEmailLoginVisible((visible) => !visible)}>{emailLoginVisible ? '收起邮箱登录' : '已有邮箱账号'}</Text>
          <Text onClick={() => Taro.navigateTo({ url: '/pages/auth/register/index' })}>注册新账号</Text>
          {emailLoginVisible && <Text onClick={() => Taro.showModal({ title: '忘记密码', content: '一期不提供自动找回，请联系管理员线下核验并生成临时密码。', showCancel: false })}>忘记密码</Text>}
        </View>
        <Text className='privacy-link' onClick={() => Taro.showModal({ title: '隐私说明', content: '登录后，食物、偏好和饮食记录将按后端隐私规则保存。', showCancel: false })}>隐私保护说明</Text>
      </View>
    </View>
  )
}
