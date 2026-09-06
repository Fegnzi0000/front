import { Button, Checkbox, CheckboxGroup, Picker, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useRef, useState } from 'react'
import { resolveLoginNextStep } from '../../../domain/core'
import { LEGAL_VERSION, CONTACT_EMAIL } from '../../../domain/legal'
import { api, clearTokens, type LoginConsent } from '../../../services/api'
import './index.scss'

export default function LoginPage() {
  const [agreed, setAgreed] = useState(false)
  const [age, setAge] = useState(-1)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const busy = useRef(false)
  const ages = ['不满十四周岁', '十四至十七周岁', '已满十八周岁']
  const open = (kind: string) => Taro.navigateTo({ url: `/pages/legal/index?kind=${kind}` })
  const login = async () => {
    if (busy.current) return
    if (!agreed || age < 1) { setError(age === 0 ? '首版暂不向不满十四周岁者开放登录，可阅读协议或联系我们。' : '请确认年龄段并主动同意协议'); return }
    busy.current = true; setSubmitting(true); setError('')
    try {
      if (process.env.TARO_ENV !== 'weapp') throw new Error('请在微信小程序中登录，普通网页暂不支持此登录方式')
      if (typeof Taro.getPrivacySetting !== 'function') throw new Error('微信版本较旧，请升级微信后重试')
      const needed = await new Promise<boolean>((resolve, reject) => Taro.getPrivacySetting({ success: r => resolve(r.needAuthorization), fail: reject }))
      if (needed) await new Promise<void>((resolve, reject) => Taro.requirePrivacyAuthorize({ success: () => resolve(), fail: () => reject(new Error('未同意微信隐私授权，未进行登录')) }))
      const consent: LoginConsent = { accepted: true, termsVersion: LEGAL_VERSION, privacyVersion: LEGAL_VERSION, ageBand: age === 1 ? 'AGE_14_17' : 'ADULT' }
      clearTokens()
      const result = await Taro.login()
      if (!result.code) throw new Error('未获取到微信凭证，请重试')
      const auth = await api.weChatMiniProgramLogin(result.code, consent)
      const route = auth.user.role === 'USER' ? resolveLoginNextStep(auth.nextStep) : null
      if (!route) { clearTokens(); throw new Error('请使用普通用户微信账号登录') }
      if (route === '/pages/home/index') await Taro.switchTab({ url: route })
      else await Taro.reLaunch({ url: route })
    } catch (reason) { setError(reason instanceof Error ? reason.message : '登录未完成，请检查网络或稍后重试') }
    finally { busy.current = false; setSubmitting(false) }
  }
  return <View className='login-page'>
    <View className='brand-orb'>🍚</View><Text className='brand-name'>是啊，吃什么？</Text>
    <Text className='slogan'>饮食选择参考，由你决定</Text>
    <View className='login-card'>
      <Text className='wechat-note'>首次微信登录将创建账号。不会获取手机号或真实头像。</Text>
      <Picker mode='selector' range={ages} onChange={e => { setAge(Number(e.detail.value)); setAgreed(false) }} disabled={submitting}>
        <View className='input'>{age < 0 ? '请选择你的年龄段' : ages[age]}</View>
      </Picker>
      {age === 1 && <Text className='wechat-note'>请与监护人共同阅读协议，在指导下使用；暂不开放医疗过敏信息录入。</Text>}
      {age === 0 && <Text className='error'>暂不开放登录；误注册或其他问题请联系我们。</Text>}
      <View className='login-links'><Text onClick={() => open('terms')}>用户协议</Text><Text onClick={() => open('privacy')}>隐私政策</Text></View>
      <CheckboxGroup onChange={e => setAgreed(e.detail.value.includes('agree'))}><View><Checkbox value='agree' checked={agreed} disabled={submitting} />我已阅读并同意用户协议和隐私政策</View></CheckboxGroup>
      <Button className='primary-button' loading={submitting} disabled={submitting || !agreed || age < 1} onClick={login}>同意并微信登录</Button>
      <Text className='wechat-note'>不同意则不登录。医疗过敏信息另行征求可选同意。</Text>
      {error && <Text className='error'>{error}</Text>}
      <Text selectable className='wechat-note'>提供者：唯一 · 联系邮箱：{CONTACT_EMAIL}</Text>
    </View>
  </View>
}
