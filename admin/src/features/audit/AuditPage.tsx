import { EyeOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Button, Card, DatePicker, Descriptions, Drawer, Form, Input, Select, Space, Table, Typography, message, type TableColumnsType } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { api, type AuditQuery } from '../../shared/api/api'
import type { AuditAction, AuditLog, AuditResult } from '../../shared/contracts/contracts'
import { AuditResultTag } from '../../shared/ui/StatusTag'
import { CopyText } from '../../shared/ui/CopyText'
import { RequestError } from '../../shared/ui/RequestError'
import { validateDateRange } from '../../shared/utils/dateRange'
import { safeAuditDetails } from './auditDetail'

type FilterForm = { adminAccount?: string; targetUserEmail?: string; targetUserNickname?: string; action?: AuditAction; result?: AuditResult; dateRange?: [Dayjs, Dayjs] }

const actionLabels: Record<string, string> = {
  USER_DISABLED: '禁用用户', USER_ENABLED: '启用用户', USER_STATUS_UNCHANGED: '状态未变化', TEMP_PASSWORD_CREATED: '生成临时密码',
  USER_STATUS_UPDATE: '修改用户状态', TEMP_PASSWORD_CREATE: '生成临时密码',
}

function queryFromParams(params: URLSearchParams): AuditQuery {
  return {
    adminAccount: params.get('adminAccount') || undefined,
    targetUserEmail: params.get('targetUserEmail') || undefined,
    targetUserNickname: params.get('targetUserNickname') || undefined,
    action: (params.get('action') as AuditAction | null) ?? undefined,
    result: (params.get('result') as AuditResult | null) ?? undefined,
    startDate: params.get('startDate') || undefined,
    endDate: params.get('endDate') || undefined,
    page: Math.max(0, Number(params.get('page') || 0)), size: Math.min(100, Math.max(1, Number(params.get('size') || 20))),
  }
}

export default function AuditPage() {
  const [params, setParams] = useSearchParams()
  const [form] = Form.useForm<FilterForm>()
  const [selected, setSelected] = useState<AuditLog | null>(null)
  const query = useMemo(() => queryFromParams(params), [params])
  const logs = useQuery({ queryKey: ['audit-logs', query], queryFn: () => api.auditLogs(query), placeholderData: keepPreviousData })
  const submit = (values: FilterForm) => {
    const startDate = values.dateRange?.[0]?.format('YYYY-MM-DD')
    const endDate = values.dateRange?.[1]?.format('YYYY-MM-DD')
    const validation = validateDateRange(startDate, endDate, 90)
    if (!validation.valid) { void message.error(validation.message); return }
    const next: Record<string, string> = { page: '0', size: String(query.size ?? 20) }
    if (values.adminAccount?.trim()) next.adminAccount = values.adminAccount.trim()
    if (values.targetUserEmail?.trim()) next.targetUserEmail = values.targetUserEmail.trim()
    if (values.targetUserNickname?.trim()) next.targetUserNickname = values.targetUserNickname.trim()
    if (values.action) next.action = values.action
    if (values.result) next.result = values.result
    if (startDate && endDate) { next.startDate = startDate; next.endDate = endDate }
    setParams(next)
  }
  const columns: TableColumnsType<AuditLog> = [
    { title: '时间', dataIndex: 'createdAt', width: 180, render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm:ss') },
    { title: '管理员', key: 'admin', width: 200, render: (_, item) => <Space orientation="vertical" size={0}><Typography.Text>{item.admin.account ?? '历史账号'}</Typography.Text>{item.admin.nickname && <Typography.Text type="secondary">{item.admin.nickname}</Typography.Text>}</Space> },
    { title: '目标用户', key: 'target', width: 260, render: (_, item) => item.targetUser ? <Space orientation="vertical" size={0}><Typography.Text>{item.targetUser.email ?? '历史账号'}</Typography.Text>{item.targetUser.nickname && <Typography.Text type="secondary">{item.targetUser.nickname}</Typography.Text>}</Space> : '—' },
    { title: '操作', dataIndex: 'action', width: 150, render: (value: string) => actionLabels[value] ?? value },
    { title: '结果', dataIndex: 'result', width: 90, render: (value: AuditResult) => <AuditResultTag result={value} /> },
    { title: '请求编号', dataIndex: 'requestId', width: 220, render: (value: string | null) => value ? <CopyText value={value} /> : '—' },
    { title: '详情', key: 'detail', fixed: 'right', width: 90, render: (_, item) => <Button type="link" icon={<EyeOutlined />} onClick={() => setSelected(item)}>查看</Button> },
  ]
  if (logs.isError && !logs.data) return <RequestError error={logs.error} onRetry={() => void logs.refetch()} />
  const details = safeAuditDetails(selected?.detail ?? null)
  return (
    <Space orientation="vertical" size={16} className="page-stack">
      <Card className="filter-card">
        <Form<FilterForm> form={form} layout="inline" onFinish={submit} initialValues={{ adminAccount: query.adminAccount, targetUserEmail: query.targetUserEmail, targetUserNickname: query.targetUserNickname, action: query.action, result: query.result, dateRange: query.startDate && query.endDate ? [dayjs(query.startDate), dayjs(query.endDate)] : undefined }}>
          <Form.Item label="管理员账号" name="adminAccount"><Input allowClear placeholder="支持模糊查询，如：ad" /></Form.Item>
          <Form.Item label="目标用户邮箱" name="targetUserEmail"><Input allowClear placeholder="支持模糊查询，如：user" /></Form.Item>
          <Form.Item label="目标用户昵称" name="targetUserNickname"><Input allowClear placeholder="昵称包含" /></Form.Item>
          <Form.Item label="操作" name="action"><Select allowClear placeholder="全部操作" style={{ width: 160 }} options={Object.entries(actionLabels).map(([value, label]) => ({ value, label }))} /></Form.Item>
          <Form.Item label="结果" name="result"><Select allowClear placeholder="全部" style={{ width: 110 }} options={[{ value: 'SUCCESS', label: '成功' }, { value: 'FAILURE', label: '失败' }]} /></Form.Item>
          <Form.Item label="日期" name="dateRange"><DatePicker.RangePicker /></Form.Item>
          <Form.Item><Space><Button type="primary" htmlType="submit" icon={<SearchOutlined />}>查询</Button><Button icon={<ReloadOutlined />} onClick={() => { form.resetFields(); setParams({ page: '0', size: '20' }) }}>重置</Button></Space></Form.Item>
        </Form>
        <Typography.Text type="secondary">未选择日期时由后端返回最近 30 天记录，最大查询范围为 90 天。</Typography.Text>
      </Card>
      <Card><Table<AuditLog> rowKey="id" loading={logs.isPending || logs.isFetching} dataSource={logs.data?.items ?? []} columns={columns} scroll={{ x: 1350 }} pagination={{ current: (logs.data?.page ?? 0) + 1, pageSize: logs.data?.size ?? 20, total: logs.data?.totalElements ?? 0, showSizeChanger: true, pageSizeOptions: [20, 50, 100], showTotal: (total) => `共 ${total} 条记录`, onChange: (page, size) => { const next = new URLSearchParams(params); next.set('page', String(page - 1)); next.set('size', String(size)); setParams(next) } }} /></Card>
      <Drawer title="审计详情" size={480} open={Boolean(selected)} onClose={() => setSelected(null)}>
        {selected && <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="操作">{actionLabels[selected.action] ?? selected.action}</Descriptions.Item>
          <Descriptions.Item label="结果"><AuditResultTag result={selected.result} /></Descriptions.Item>
          <Descriptions.Item label="管理员">{selected.admin.account ?? '历史账号'}{selected.admin.nickname ? `（${selected.admin.nickname}）` : ''}</Descriptions.Item>
          <Descriptions.Item label="目标用户">{selected.targetUser ? `${selected.targetUser.email ?? '历史账号'}${selected.targetUser.nickname ? `（${selected.targetUser.nickname}）` : ''}` : '—'}</Descriptions.Item>
          <Descriptions.Item label="请求编号">{selected.requestId ? <CopyText value={selected.requestId} /> : '—'}</Descriptions.Item>
          {details.map(([label, value]) => <Descriptions.Item key={label} label={label}>{value}</Descriptions.Item>)}
          {details.length === 0 && <Descriptions.Item label="摘要">无可展示的非敏感详情</Descriptions.Item>}
        </Descriptions>}
      </Drawer>
    </Space>
  )
}
