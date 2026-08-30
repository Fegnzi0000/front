import { App as AntApp, ConfigProvider, Result, Spin } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense, useState } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router'
import { AuthProvider, useAuth } from '../features/auth/AuthContext'
import AdminLayout from './AdminLayout'
import './styles.css'

const LoginPage = lazy(() => import('../features/auth/LoginPage'))
const ChangePasswordPage = lazy(() => import('../features/auth/ChangePasswordPage'))
const DashboardPage = lazy(() => import('../features/dashboard/DashboardPage'))
const UsersPage = lazy(() => import('../features/users/UsersPage'))
const AuditPage = lazy(() => import('../features/audit/AuditPage'))

const theme = {
  token: {
    colorPrimary: '#9B4500', colorSuccess: '#2D6A3C', colorWarning: '#835500', colorError: '#BA1A1A',
    colorText: '#221A17', colorTextSecondary: '#564338', colorTextDescription: '#564338', colorTextTertiary: '#564338', colorBorder: '#DDC1B3', colorBgLayout: '#FFF8F6',
    borderRadius: 12, controlHeight: 40,
    fontFamily: 'MiSans, Noto Sans SC, PingFang SC, Microsoft YaHei, system-ui, sans-serif',
  },
  components: { Layout: { siderBg: '#35251F', headerBg: '#FFFFFF' }, Menu: { darkItemBg: '#35251F', darkItemSelectedBg: '#9B4500' }, Table: { headerBg: '#FFF1ED', headerColor: '#221A17' } },
}

function Loading() { return <div className="route-loading"><Spin size="large" description="正在加载" /></div> }

function ProtectedRoute() {
  const { status } = useAuth()
  if (status === 'loading') return <Loading />
  if (status === 'force-change') return <Navigate to="/change-password" replace />
  if (status !== 'authenticated') return <Navigate to="/login" replace />
  return <Outlet />
}

function LoginRoute() {
  const { status } = useAuth()
  if (status === 'loading') return <Loading />
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />
  if (status === 'force-change') return <Navigate to="/change-password" replace />
  return <LoginPage />
}

function PasswordRoute() {
  const { status } = useAuth()
  if (status === 'loading') return <Loading />
  if (status === 'force-change') return <ChangePasswordPage />
  return <Navigate to={status === 'authenticated' ? '/dashboard' : '/login'} replace />
}

function NotFound() {
  const { status } = useAuth()
  return <Result status="404" title="页面不存在" subTitle="你访问的管理页面不存在。" extra={<a href={status === 'authenticated' ? '/dashboard' : '/login'}>返回安全入口</a>} />
}

function AppRoutes() {
  return <Suspense fallback={<Loading />}><Routes>
    <Route path="/login" element={<LoginRoute />} />
    <Route path="/change-password" element={<PasswordRoute />} />
    <Route element={<ProtectedRoute />}><Route element={<AdminLayout />}>
      <Route index element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/users" element={<UsersPage />} />
      <Route path="/audit-logs" element={<AuditPage />} />
    </Route></Route>
    <Route path="*" element={<NotFound />} />
  </Routes></Suspense>
}

export function App() {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: {
    queries: { retry: (count, error) => count < 1 && (!(error instanceof Error) || !('status' in error) || Number((error as { status: number }).status) >= 500), refetchOnWindowFocus: true },
    mutations: { retry: false },
  } }))
  return <ConfigProvider locale={zhCN} theme={theme}><AntApp><QueryClientProvider client={queryClient}><BrowserRouter><AuthProvider>
    <AppRoutes />
  </AuthProvider></BrowserRouter></QueryClientProvider></AntApp></ConfigProvider>
}
