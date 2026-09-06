import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import AuditPage from './audit/AuditPage'
import UsersPage from './users/UsersPage'

const apiMock = vi.hoisted(() => ({
  users: vi.fn().mockResolvedValue({
    items: [{
      id: 'f8928f34-01f2-4454-a005-d98963d1007e',
      email: 'legacy@example.com',
      nickname: '微信用户',
      role: 'USER',
      status: 'ACTIVE',
      onboardingCompleted: true,
      mustChangePassword: false,
      createdAt: '2026-09-06T10:00:00.000Z',
      lastLoginAt: '2026-09-06T11:00:00.000Z',
    }],
    page: 0,
    size: 20,
    totalElements: 1,
    totalPages: 1,
  }),
  auditLogs: vi.fn().mockResolvedValue({
    items: [{
      id: 'audit-1',
      admin: { account: 'admin', nickname: '管理员' },
      targetUser: { email: 'legacy@example.com', nickname: '微信用户' },
      action: 'USER_DISABLED',
      result: 'SUCCESS',
      requestId: 'request-1',
      detail: {},
      createdAt: '2026-09-06T10:00:00.000Z',
    }],
    page: 0,
    size: 20,
    totalElements: 1,
    totalPages: 1,
  }),
  updateUserStatus: vi.fn(),
  createTemporaryPassword: vi.fn(),
}))

vi.mock('../shared/api/api', () => ({ api: apiMock }))

function renderPage(page: React.ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{page}</QueryClientProvider>
    </MemoryRouter>,
  )
}

describe('email-free administrator surfaces', () => {
  it('identifies consumers by nickname and UUID without an email filter or email display', async () => {
    renderPage(<UsersPage />)
    expect(await screen.findByText('微信用户')).toBeInTheDocument()
    expect(screen.getByText('f8928f34-01f2-4454-a005-d98963d1007e')).toBeInTheDocument()
    expect(screen.queryByText('legacy@example.com')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('邮箱')).not.toBeInTheDocument()
  })

  it('identifies audit targets by nickname without exposing an email filter or email value', async () => {
    renderPage(<AuditPage />)
    expect(await screen.findByText('微信用户')).toBeInTheDocument()
    expect(screen.queryByText('legacy@example.com')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('目标用户邮箱')).not.toBeInTheDocument()
  })
})
