import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Card, DatePicker, Form, Input, Modal, Select, Space, Table, Tag, Typography, message, type TableColumnsType } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { api, type UserListQuery } from '../../shared/api/api'
import { ApiClientError } from '../../shared/api/client'
import type { AdminUser, UserStatus } from '../../shared/contracts/contracts'
import { CopyText } from '../../shared/ui/CopyText'
import { RequestError } from '../../shared/ui/RequestError'
import { UserStatusTag } from '../../shared/ui/StatusTag'
import { validateDateRange } from '../../shared/utils/dateRange'
import { getUserActions } from './userActions'

type FilterForm = { nickname?: string; status?: UserStatus; registeredRange?: [Dayjs, Dayjs] }

function queryFromParams(params: URLSearchParams): UserListQuery {
  return {
    nickname: params.get('nickname') || undefined,
    status: (params.get('status') as UserStatus | null) ?? undefined,
    registeredStartDate: params.get('registeredStartDate') || undefined,
    registeredEndDate: params.get('registeredEndDate') || undefined,
    page: Math.max(0, Number(params.get('page') || 0)),
    size: Math.min(100, Math.max(1, Number(params.get('size') || 20))),
  }
}

export default function UsersPage() {
  const [params, setParams] = useSearchParams()
  const [form] = Form.useForm<FilterForm>()
  const queryClient = useQueryClient()
  const query = useMemo(() => queryFromParams(params), [params])
  const users = useQuery({ queryKey: ['users', query], queryFn: () => api.users(query), placeholderData: keepPreviousData })
  const [confirmUser, setConfirmUser] = useState<{ user: AdminUser; action: 'ENABLE' | 'DISABLE' } | null>(null)

  const statusMutation = useMutation({
    mutationFn: ({ user, action }: { user: AdminUser; action: 'ENABLE' | 'DISABLE' }) => api.updateUserStatus(user.id, action === 'ENABLE' ? 'ACTIVE' : 'DISABLED'),
    onSuccess: async () => { void message.success('用户状态已更新'); await queryClient.invalidateQueries({ queryKey: ['users'] }) },
    onError: async (error) => {
      void message.error(error instanceof ApiClientError ? error.message : '操作失败')
      if (error instanceof ApiClientError && [404, 409].includes(error.status)) await queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const submit = (values: FilterForm) => {
    const start = values.registeredRange?.[0]?.format('YYYY-MM-DD')
    const end = values.registeredRange?.[1]?.format('YYYY-MM-DD')
    const validation = validateDateRange(start, end, 90)
    if (!validation.valid) { void message.error(validation.message); return }
    const next: Record<string, string> = { page: '0', size: String(query.size ?? 20) }
    if (values.nickname?.trim()) next.nickname = values.nickname.trim()
    if (values.status) next.status = values.status
    if (start && end) { next.registeredStartDate = start; next.registeredEndDate = end }
    setParams(next)
  }

  const runConfirmedAction = () => {
    if (!confirmUser) return
    statusMutation.mutate({ user: confirmUser.user, action: confirmUser.action })
    setConfirmUser(null)
  }

  const columns: TableColumnsType<AdminUser> = [
    { title: '用户', key: 'user', width: 220, render: (_, item) => <Space orientation="vertical" size={0}><Typography.Text>{item.nickname || '未设置昵称'}</Typography.Text><CopyText value={item.id} /></Space> },
    { title: '状态', dataIndex: 'status', width: 84, render: (status: UserStatus) => <UserStatusTag status={status} /> },
    { title: '引导', dataIndex: 'onboardingCompleted', width: 84, render: (value: boolean) => <Tag color={value ? 'success' : 'default'}>{value ? '已完成' : '未完成'}</Tag> },
    { title: '注册时间', dataIndex: 'createdAt', width: 150, render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm') },
    { title: '最后登录', dataIndex: 'lastLoginAt', width: 150, render: (value: string | null) => value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '从未登录' },
    { title: '操作', key: 'actions', width: 190, render: (_, user) => <Space>{getUserActions(user.status).map((action) => <Button key={action} size="small" type={action === 'DISABLE' ? 'link' : 'default'} danger={action === 'DISABLE'} onClick={() => setConfirmUser({ user, action })}>{action === 'ENABLE' ? '启用' : '禁用'}</Button>)}</Space> },
  ]

  if (users.isError && !users.data) return <RequestError error={users.error} onRetry={() => void users.refetch()} />
  return (
    <Space orientation="vertical" size={16} className="page-stack">
      {users.isError && <Alert type="warning" showIcon title="刷新失败，当前显示上次成功数据" />}
      <Card className="filter-card">
        <Form<FilterForm> form={form} layout="inline" onFinish={submit} initialValues={{ nickname: query.nickname, status: query.status, registeredRange: query.registeredStartDate && query.registeredEndDate ? [dayjs(query.registeredStartDate), dayjs(query.registeredEndDate)] : undefined }}>
          <Form.Item label="昵称" name="nickname"><Input allowClear placeholder="昵称包含" /></Form.Item>
          <Form.Item label="状态" name="status"><Select allowClear placeholder="全部状态" style={{ width: 130 }} options={[{ value: 'ACTIVE', label: '正常' }, { value: 'DISABLED', label: '已禁用' }, { value: 'CANCELLED', label: '已注销' }]} /></Form.Item>
          <Form.Item label="注册日期" name="registeredRange"><DatePicker.RangePicker /></Form.Item>
          <Form.Item><Space><Button type="primary" htmlType="submit" icon={<SearchOutlined />}>查询</Button><Button icon={<ReloadOutlined />} onClick={() => { form.resetFields(); setParams({ page: '0', size: '20' }) }}>重置</Button></Space></Form.Item>
        </Form>
      </Card>
      <Card>
        <Table<AdminUser> rowKey="id" loading={users.isPending || users.isFetching} dataSource={users.data?.items ?? []} columns={columns} scroll={{ x: 988 }} pagination={{ current: (users.data?.page ?? 0) + 1, pageSize: users.data?.size ?? 20, total: users.data?.totalElements ?? 0, showSizeChanger: true, pageSizeOptions: [20, 50, 100], showTotal: (total) => `共 ${total} 位用户`, onChange: (page, size) => { const next = new URLSearchParams(params); next.set('page', String(page - 1)); next.set('size', String(size)); setParams(next) } }} />
      </Card>
      <Modal open={Boolean(confirmUser)} title={confirmUser?.action === 'DISABLE' ? '确认禁用用户' : '确认启用用户'} confirmLoading={statusMutation.isPending} okButtonProps={{ danger: confirmUser?.action === 'DISABLE' }} onOk={runConfirmedAction} onCancel={() => setConfirmUser(null)} okText="确认" cancelText="取消">
        <Typography.Paragraph>目标账号：<Typography.Text strong>{confirmUser?.user.nickname}</Typography.Text><br />{confirmUser?.user.id}</Typography.Paragraph>
        <Typography.Paragraph type="secondary">{confirmUser?.action === 'DISABLE' ? '禁用后，该用户现有会话将立即失效。' : '启用后，用户可以重新使用微信登录。'}</Typography.Paragraph>
      </Modal>
    </Space>
  )
}
