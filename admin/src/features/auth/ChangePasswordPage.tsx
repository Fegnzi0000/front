import { Alert, Button, Card, Form, Input, Typography } from 'antd'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ApiClientError } from '../../shared/api/client'
import { useAuth } from './AuthContext'

type PasswordForm = { currentPassword: string; newPassword: string; confirmNewPassword: string }

export default function ChangePasswordPage() {
  const { changePassword, logout } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const submit = async (values: PasswordForm) => {
    setLoading(true)
    setError(null)
    try {
      await changePassword(values.currentPassword, values.newPassword, values.confirmNewPassword)
      void navigate('/dashboard', { replace: true })
    } catch (caught) {
      setError(caught instanceof ApiClientError ? caught.message : '密码修改失败，请重试')
    } finally { setLoading(false) }
  }
  return (
    <main className="centered-page">
      <Card className="password-card">
        <Typography.Title level={2}>首次登录，请修改密码</Typography.Title>
        <Typography.Paragraph type="secondary">完成修改前不能访问管理数据。</Typography.Paragraph>
        {error && <Alert type="error" title={error} showIcon className="form-alert" />}
        <Form<PasswordForm> layout="vertical" onFinish={(values) => { void submit(values) }} requiredMark={false}>
          <Form.Item label="当前临时密码" name="currentPassword" rules={[{ required: true }, { pattern: /^[A-Za-z0-9_]{6,20}$/ }]}><Input.Password /></Form.Item>
          <Form.Item label="新密码" name="newPassword" rules={[{ required: true }, { pattern: /^[A-Za-z0-9_]{6,20}$/, message: '密码为 6–20 位字母、数字或下划线' }]}><Input.Password /></Form.Item>
          <Form.Item label="确认新密码" name="confirmNewPassword" dependencies={['newPassword']} rules={[{ required: true }, ({ getFieldValue }) => ({ validator(_, value) { return !value || getFieldValue('newPassword') === value ? Promise.resolve() : Promise.reject(new Error('两次输入的密码不一致')) } })]}><Input.Password /></Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>确认修改</Button>
          <Button type="link" onClick={() => void logout()} block>退出登录</Button>
        </Form>
      </Card>
    </main>
  )
}
