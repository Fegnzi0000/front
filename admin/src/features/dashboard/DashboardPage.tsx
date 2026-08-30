import { CalendarOutlined, CheckCircleOutlined, DashboardOutlined, FieldTimeOutlined, TeamOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Alert, Button, Card, Col, DatePicker, Descriptions, Row, Skeleton, Space, Statistic, Table, Typography, message } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useMemo, useState } from 'react'
import { api, type DashboardQuery } from '../../shared/api/api'
import { validateDateRange } from '../../shared/utils/dateRange'
import { EChart } from '../../shared/ui/EChart'
import { RequestError } from '../../shared/ui/RequestError'

const { RangePicker } = DatePicker

export default function DashboardPage() {
  const [query, setQuery] = useState<DashboardQuery>({})
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const dashboard = useQuery({ queryKey: ['dashboard', query], queryFn: () => api.dashboard(query), staleTime: 30_000 })
  const applyRange = () => {
    const startDate = range?.[0]?.format('YYYY-MM-DD')
    const endDate = range?.[1]?.format('YYYY-MM-DD')
    const validation = validateDateRange(startDate, endDate, 90)
    if (!validation.valid) { void message.error(validation.message); return }
    setQuery(startDate && endDate ? { startDate, endDate } : {})
  }

  const trendOption = useMemo(() => ({
    color: ['#9B4500', '#2D6A3C', '#835500'],
    tooltip: { trigger: 'axis' }, legend: { bottom: 0 },
    grid: { left: 42, right: 22, top: 22, bottom: 52 },
    xAxis: { type: 'category', data: dashboard.data?.dailySeries.map((item) => item.date.slice(5)) ?? [] },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      { name: '新增用户', type: 'line', smooth: true, data: dashboard.data?.dailySeries.map((item) => item.newUsers) ?? [] },
      { name: '活跃用户', type: 'line', smooth: true, data: dashboard.data?.dailySeries.map((item) => item.activeUsers) ?? [] },
      { name: '饮食记录', type: 'line', smooth: true, data: dashboard.data?.dailySeries.map((item) => item.dietRecords) ?? [] },
    ],
  }), [dashboard.data])

  const sourceOption = useMemo(() => ({
    color: ['#9B4500', '#2D6A3C'], tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0 }, series: [{ type: 'pie', radius: ['50%', '72%'], center: ['50%', '44%'], label: { formatter: '{b}\n{d}%' }, data: (dashboard.data?.recordSourceDistribution ?? []).map((item) => ({ name: item.source === 'MANUAL' ? '手动记录' : '老虎机记录', value: item.count })) }],
  }), [dashboard.data])

  if (dashboard.isPending) return <Skeleton active paragraph={{ rows: 10 }} />
  if (dashboard.isError && !dashboard.data) return <RequestError error={dashboard.error} onRetry={() => void dashboard.refetch()} />
  const data = dashboard.data
  if (!data) return null
  const cards = [
    ['累计用户', data.summary.totalUsers, <TeamOutlined />], ['今日新增', data.summary.todayNewUsers, <CalendarOutlined />],
    ['范围内活跃用户', data.summary.activeUsers, <DashboardOutlined />], ['饮食记录', data.summary.dietRecords, <FieldTimeOutlined />],
    ['老虎机抽取', data.summary.slotSpins, <DashboardOutlined />], ['已确认抽取', data.summary.slotConfirmed, <CheckCircleOutlined />],
    ['抽取确认率', `${data.summary.slotConfirmationRate}%`, <CheckCircleOutlined />],
  ] as const
  return (
    <Space orientation="vertical" size={20} className="page-stack">
      {dashboard.isError && <Alert type="warning" showIcon title="刷新失败，当前展示上次成功数据" action={<Button size="small" onClick={() => void dashboard.refetch()}>重试</Button>} />}
      <Card className="filter-card">
        <Space wrap>
          <RangePicker value={range} onChange={(value) => setRange(value ? [value[0], value[1]] : null)} disabledDate={(current) => current.isAfter(dayjs(), 'day')} />
          <Button type="primary" onClick={applyRange}>查询</Button>
          <Button onClick={() => { setRange(null); setQuery({}) }}>最近 7 天</Button>
          <Typography.Text type="secondary">统计时区：{data.range.timezone}，当前范围 {data.range.startDate} 至 {data.range.endDate}</Typography.Text>
        </Space>
      </Card>
      <Row gutter={[16, 16]}>{cards.map(([title, value, icon]) => <Col xs={24} sm={12} lg={6} xl={6} key={title}><Card className="metric-card"><Statistic title={title} value={value} prefix={icon} /></Card></Col>)}</Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}><Card title="运营趋势"><EChart option={trendOption} label={`从 ${data.range.startDate} 到 ${data.range.endDate} 的新增用户、活跃用户和饮食记录趋势`} /></Card></Col>
        <Col xs={24} xl={8}><Card title="记录来源"><EChart option={sourceOption} label="手动记录与老虎机记录来源分布" /><Descriptions size="small" column={1}>{data.recordSourceDistribution.map((item) => <Descriptions.Item key={item.source} label={item.source === 'MANUAL' ? '手动记录' : '老虎机记录'}>{item.count} 条（{item.percentage}%）</Descriptions.Item>)}</Descriptions></Card></Col>
      </Row>
      <Card title="趋势数据表" className="accessible-data-table">
        <Table rowKey="date" pagination={false} size="small" dataSource={data.dailySeries} columns={[{ title: '日期', dataIndex: 'date' }, { title: '新增用户', dataIndex: 'newUsers' }, { title: '活跃用户', dataIndex: 'activeUsers' }, { title: '饮食记录', dataIndex: 'dietRecords' }]} />
      </Card>
    </Space>
  )
}
