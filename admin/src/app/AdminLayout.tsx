import { AuditOutlined, DashboardOutlined, LogoutOutlined, MenuOutlined, TeamOutlined } from '@ant-design/icons'
import { Button, Drawer, Layout, Menu, Space, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../features/auth/AuthContext'

const { Header, Sider, Content } = Layout

const items = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: <NavLink to="/dashboard">运营概况</NavLink> },
  { key: '/users', icon: <TeamOutlined />, label: <NavLink to="/users">用户管理</NavLink> },
  { key: '/audit-logs', icon: <AuditOutlined />, label: <NavLink to="/audit-logs">审计日志</NavLink> },
]

function Brand() {
  return <div className="admin-brand"><span className="admin-brand-icon">饭</span><span>AI 干饭搭子<small>管理后台</small></span></div>
}

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobile, setMobile] = useState(() => window.innerWidth < 1024)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const update = () => setMobile(window.innerWidth < 1024)
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  const title = location.pathname === '/users' ? '用户管理' : location.pathname === '/audit-logs' ? '审计日志' : '运营概况'
  const nav = <><Brand /><Menu theme="dark" mode="inline" selectedKeys={[location.pathname]} items={items} onClick={() => setOpen(false)} /></>
  return (
    <Layout className="admin-shell">
      <a className="skip-link" href="#main-content">跳到主要内容</a>
      {!mobile && <Sider width={240} className="admin-sider">{nav}</Sider>}
      <Drawer placement="left" size={280} open={mobile && open} onClose={() => setOpen(false)} styles={{ body: { padding: 0, background: '#35251f' } }}>{nav}</Drawer>
      <Layout>
        <Header className="admin-header">
          <Space>{mobile && <Button type="text" icon={<MenuOutlined />} aria-label="打开导航" onClick={() => setOpen(true)} />}<Typography.Title level={3}>{title}</Typography.Title></Space>
          <Space><Typography.Text type="secondary" className="admin-email">{user?.email}</Typography.Text><Button icon={<LogoutOutlined />} onClick={() => void logout().then(() => navigate('/login'))}>退出</Button></Space>
        </Header>
        <Content id="main-content" className="admin-content"><div className="content-inner"><Outlet /></div></Content>
      </Layout>
    </Layout>
  )
}
