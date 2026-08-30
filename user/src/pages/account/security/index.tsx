import { Button, Input, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'

import { PageHeader } from '../../../components/ui'
import { validatePasswordChange } from '../../../domain/core'
import { api, clearTokens } from '../../../services/api'

export default function AccountSecurityPage() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const changePassword = async () => {
    const validation = validatePasswordChange(currentPassword, newPassword, confirmation)
    if (validation) return setError(validation)
    try {
      await api.changePassword(currentPassword, newPassword, confirmation)
      clearTokens()
      await Taro.reLaunch({ url: '/pages/auth/login/index?reason=passwordChanged' })
    } catch (reason) { setError(reason instanceof Error ? reason.message : '修改失败') }
  }
  const cancelAccount = async () => {
    const first = await Taro.showModal({ title: '注销账号？', content: '注销后将撤销全部会话，账号不可恢复。', confirmText: '继续注销', confirmColor: '#BA1A1A' })
    if (!first.confirm) return
    const second = await Taro.showModal({ title: '最后确认', content: '将使用上方“当前密码”输入框中的密码确认注销。', confirmText: '确认注销', confirmColor: '#BA1A1A' })
    if (!second.confirm) return
    try { await api.cancelAccount(currentPassword); clearTokens(); await Taro.reLaunch({ url: '/pages/auth/login/index' }) } catch (reason) { setError(reason instanceof Error ? reason.message : '注销失败') }
  }
  return <View className='page page-secondary'><PageHeader back title='账号与安全' subtitle='头像、密码和账号状态' />
    <Text className='group-title'>头像</Text><View className='card row'><View><Text className='action-title'>当前头像</Text><Text className='action-note'>一期暂不提供头像上传，后续接入微信头像授权。</Text></View></View>
    <Text className='group-title'>修改密码</Text><View className='card'><View className='field'><Text className='label'>当前密码</Text><Input className='input' password value={currentPassword} onInput={(event) => setCurrentPassword(event.detail.value)} /></View><View className='field'><Text className='label'>新密码</Text><Input className='input' password value={newPassword} placeholder='6～20位字母、数字或下划线' onInput={(event) => setNewPassword(event.detail.value)} /></View><View className='field'><Text className='label'>确认新密码</Text><Input className='input' password value={confirmation} onInput={(event) => setConfirmation(event.detail.value)} /></View>{error && <Text className='error'>{error}</Text>}<Button className='primary-button' onClick={changePassword}>修改密码</Button></View>
    <Text className='group-title'>注销账号</Text><View className='card'><Text className='action-title'>永久注销当前账号</Text><Text className='action-note'>该入口对应账号注销接口，并使用两次确认防止误操作。</Text><Button className='danger-button' onClick={cancelAccount}>申请注销账号</Button></View>
  </View>
}
