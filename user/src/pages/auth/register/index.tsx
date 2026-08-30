import { Button, Input, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState } from 'react'

import { PageHeader } from '../../../components/ui'
import { validatePassword } from '../../../domain/core'
import { api } from '../../../services/api'
import '../login/index.scss'

export default function RegisterPage(){const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [confirm,setConfirm]=useState('');const [error,setError]=useState('');const [submitting,setSubmitting]=useState(false);const register=async()=>{const normalized=email.trim().toLowerCase();if(!/^\S+@\S+\.\S+$/.test(normalized))return setError('请输入有效邮箱');const passwordError=validatePassword(password);if(passwordError)return setError(passwordError);if(password!==confirm)return setError('两次输入的密码不一致');setSubmitting(true);setError('');try{await api.register(normalized,password,confirm);Taro.reLaunch({url:'/pages/onboarding/index'})}catch(reason){setError(reason instanceof Error?reason.message:'注册失败，请稍后重试')}finally{setSubmitting(false)}};return <View className='login-page register-page'><PageHeader back title='注册账号' subtitle='注册后将初始化默认食物并进入引导' /><View className='login-card'><View className='field'><Text className='label'>邮箱</Text><Input className='input' value={email} placeholder='student@example.com' onInput={(e)=>setEmail(e.detail.value)} /></View><View className='field'><Text className='label'>密码</Text><Input className='input' password value={password} placeholder='6～20位字母、数字或下划线' onInput={(e)=>setPassword(e.detail.value)} /></View><View className='field'><Text className='label'>确认密码</Text><Input className='input' password value={confirm} placeholder='再次输入密码' onInput={(e)=>setConfirm(e.detail.value)} />{error&&<Text className='error'>{error}</Text>}</View><Button className='primary-button' loading={submitting} disabled={submitting} onClick={register}>注册并进入引导</Button></View></View>}
