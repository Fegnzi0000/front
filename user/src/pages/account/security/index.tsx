import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useRef, useState } from 'react'
import { PageHeader } from '../../../components/ui'
import { CONTACT_EMAIL } from '../../../domain/legal'
import { api, clearTokens } from '../../../services/api'
export default function AccountSecurityPage() {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const cancel = async () => {
    if (lock.current) return
    lock.current = true; setBusy(true)
    try {
      const answer = await Taro.showModal({ title: '确认注销账号？', content: '将重新验证当前微信身份并撤销全部会话。账号不能直接恢复，重新注册或数据清理请联系开发者。软注销不等于数据已经删除。', confirmText: '继续注销', confirmColor: '#BA1A1A' })
      if (!answer.confirm) return
      const final = await Taro.showModal({ title: '最后确认', content: '注销后无法登录原账号，是否继续？', confirmText: '确认注销' })
      if (!final.confirm) return
      const result = await Taro.login()
      if (!result.code) throw new Error('微信身份验证未完成')
      await api.cancelAccount(result.code)
      clearTokens()
      await Taro.reLaunch({ url: '/pages/auth/login/index' })
    } catch (reason) { setError(reason instanceof Error ? reason.message : '注销未完成') }
    finally { lock.current = false; setBusy(false) }
  }
  return <View className='page page-secondary'><PageHeader back title='账号与安全' subtitle='微信身份与账号管理' />
    <View className='card'><Text className='action-title'>微信登录账号</Text><Text className='action-note'>无需邮箱或密码。查询、复制、删除数据及重新注册申请请联系：</Text><Text selectable>{CONTACT_EMAIL}</Text></View>
    <View className='card'><Text className='action-title'>注销账号</Text><Text className='action-note'>注销撤销所有会话。相关数据按隐私政策处理，不会仅因软注销无限期保留。</Text>{error && <Text className='error'>{error}</Text>}<Button className='danger-button' disabled={busy} loading={busy} onClick={cancel}>申请注销账号</Button></View>
  </View>
}
