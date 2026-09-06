/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi } from 'vitest'
const segments = vi.hoisted(() => ({ current: [] as string[] }))
const push = vi.fn()

vi.mock('next/navigation', () => ({
  useSelectedLayoutSegments: () => segments.current,
  useRouter: () => ({ push }),
}))
import { RolesListPanel } from './roles-list-panel'
import type { FinanceRoleSummary } from './types'
function roles(): FinanceRoleSummary[] {
  return [
    {
      id: 'role_system',
      slug: 'admin',
      name: 'Administrator',
      description: 'All access.',
      permissions: ['billing:access'],
      isSystem: true,
      isDefault: true,
      memberCount: 4,
    },
    {
      id: 'role_custom',
      slug: 'bookkeeper',
      name: 'Bookkeeper',
      description: 'Invoices.',
      permissions: ['billing:access', 'sales:read'],
      isSystem: false,
      isDefault: false,
      memberCount: 2,
    },
  ]
}
function renderList(
  overrides: Partial<Parameters<typeof RolesListPanel>[0]> = {}
) {
  return render(
    <RolesListPanel
      roles={roles()}
      state={{ status: 'ready' }}
      detailHref={(id) => `/settings/roles/${id}`}
      typeFilter="all"
      {...overrides}
    />
  )
}
describe('RolesListPanel', () => {
  it('renders complete table columns', () => {
    segments.current = []
    renderList()
    for (const heading of ['Role', 'Type', 'Permissions', 'Members'])
      expect(screen.getByText(heading)).toBeInTheDocument()
    expect(screen.getAllByText('Default').length).toBeGreaterThan(0)
  })
  it('links role names through the injected href builder', () => {
    segments.current = []
    renderList()
    expect(screen.getByRole('link', { name: 'Administrator' })).toHaveAttribute(
      'href',
      '/settings/roles/role_system'
    )
  })
  it('filters system roles', () => {
    segments.current = []
    renderList({ typeFilter: 'system' })
    expect(screen.getByText('Administrator')).toBeInTheDocument()
    expect(screen.queryByText('Bookkeeper')).not.toBeInTheDocument()
  })
  it('filters custom roles', () => {
    segments.current = []
    renderList({ typeFilter: 'custom' })
    expect(screen.getByText('Bookkeeper')).toBeInTheDocument()
    expect(screen.queryByText('Administrator')).not.toBeInTheDocument()
  })
  it('renders a loading skeleton', () => {
    segments.current = []
    renderList({ state: { status: 'loading' } })
    expect(screen.getByText('Permissions')).toBeInTheDocument()
    expect(screen.queryByText('Administrator')).not.toBeInTheDocument()
  })
  it('keeps table mounted and displays list errors', () => {
    segments.current = []
    renderList({
      state: {
        status: 'error',
        error: { code: 'access/unavailable', message: 'Unavailable.' },
      },
    })
    expect(screen.getByText('Unavailable.')).toBeInTheDocument()
    expect(screen.getByText('Administrator')).toBeInTheDocument()
  })
  it('carries System and Default badges into condensed rows', () => {
    segments.current = ['role_system']
    renderList()
    expect(screen.getAllByText('System').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Default').length).toBeGreaterThan(0)
  })
  it('carries Custom badge into condensed rows', () => {
    segments.current = ['role_custom']
    renderList()
    expect(screen.getByText('Custom')).toBeInTheDocument()
    expect(screen.getByLabelText('View Bookkeeper role')).toHaveAttribute(
      'href',
      '/settings/roles/role_custom'
    )
  })
})
