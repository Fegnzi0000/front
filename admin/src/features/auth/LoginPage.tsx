import { LockOutlined, SafetyCertificateOutlined, UserOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Form, Input, Typography } from 'antd'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ApiClientError } from '../../shared/api/client'
import { useAuth } from './AuthContext'

type LoginForm = { account: string; password: string }

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, notice, clearNotice } = useAuth()
  const [error, setError] = useState<string | null>(notice)
  const [loading, setLoading] = useState(false)

  const submit = async (values: LoginForm) => {
    clearNotice()
    setError(null)
    setLoading(true)
    try {
      const destination = await login(values.account, values.password)
      void navigate(destination === 'home' ? '/dashboard' : '/change-password', { replace: true })
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : '登录失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-brand" aria-label="产品介绍">
        <div className="brand-mark"><SafetyCertificateOutlined /></div>
        <Typography.Title>AI 干饭搭子</Typography.Title>
        <Typography.Paragraph>简洁、可靠的运营与账号管理工作台</Typography.Paragraph>
        <ul>
          <li>聚合关键运营指标</li>
          <li>安全管理普通用户账号</li>
          <li>完整追踪管理操作</li>
        </ul>
      </section>
      <Card className="login-card" variant="borderless">
        <Typography.Title level={2}>管理员登录</Typography.Title>
        <Typography.Paragraph type="secondary">请使用已授权的管理员账号登录</Typography.Paragraph>
        {error && <Alert type="error" showIcon title={error} className="form-alert" />}
        <Form<LoginForm> layout="vertical" onFinish={(values) => { void submit(values) }} requiredMark={false}>
          <Form.Item label="账号" name="account" rules={[{ required: true, message: '请输入管理员账号' }, { pattern: /^[A-Za-z][A-Za-z0-9_]{2,31}$/, message: '账号为 3–32 位字母、数字或下划线，且以字母开头' }]}>
            <Input prefix={<UserOutlined />} autoComplete="username" placeholder="admin" size="large" />
          </Form.Item>
          <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }, { pattern: /^[A-Za-z0-9_]{6,20}$/, message: '密码为 6–20 位字母、数字或下划线' }]}>
            <Input.Password prefix={<LockOutlined />} autoComplete="current-password" size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} size="large" block>登录后台</Button>
        </Form>
      </Card>
    </main>
  )
}
