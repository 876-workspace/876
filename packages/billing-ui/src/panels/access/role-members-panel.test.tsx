/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { RoleCardPanel } from './role-card-panel'
import {
  RoleMembersPanel,
  ROLE_MEMBERS_SKELETON_COLUMNS,
} from './role-members-panel'
import type {
  FinanceMemberSummary,
  FinancePermissionSurface,
  FinanceRoleSummary,
} from './types'

const SECURITY_INPUTS = [
  '<script>alert(1)</script>',
  "' OR '1'='1",
  '../../etc/passwd',
  '__proto__',
  '\u0000',
  '\u202e',
  'a'.repeat(10_000),
] as const

function member(
  overrides: Partial<FinanceMemberSummary> = {}
): FinanceMemberSummary {
  return {
    id: 'member_alejandra',
    userId: 'user_alejandra',
    name: 'Alejandra Reyes',
    email: 'alejandra@example.com',
    avatarUrl: null,
    joinedAt: 1_783_771_200,
    roleId: 'role_bookkeeper',
    roleName: 'Bookkeeper',
    status: 'ACTIVE',
    ...overrides,
  }
}

function renderPanel(
  overrides: Partial<Parameters<typeof RoleMembersPanel>[0]> = {}
) {
  const formatDate = overrides.formatDate ?? vi.fn(() => '11 Jul 2026')
  const memberHref = overrides.memberHref ?? ((userId: string) => `/members/${userId}`)

  return {
    formatDate,
    memberHref,
    ...render(
      <RoleMembersPanel
        members={[member()]}
        state={{ status: 'ready' }}
        memberHref={memberHref}
        formatDate={formatDate}
        {...overrides}
      />
    ),
  }
}

const surface: FinancePermissionSurface = {
  app: 'billing',
  editable: ['billing:access'],
  modules: [],
}

const role: FinanceRoleSummary = {
  id: 'role_bookkeeper',
  slug: 'bookkeeper',
  name: 'Bookkeeper',
  description: 'Records payments.',
  permissions: ['billing:access'],
  isSystem: false,
  isDefault: false,
  memberCount: 0,
}

describe('RoleMembersPanel', () => {
  it('renders one row per member and no more', () => {
    renderPanel({
      members: [member(), member({ id: 'member_marcus', name: 'Marcus Bell' })],
    })

    expect(screen.getAllByRole('row')).toHaveLength(3)
    expect(screen.getByText('Alejandra Reyes')).toBeInTheDocument()
    expect(screen.getByText('Marcus Bell')).toBeInTheDocument()
  })

  it('links the member name to memberHref(userId) with the sky-blue class', () => {
    const memberHref = vi.fn((userId: string) => `/settings/users/${userId}`)
    renderPanel({ memberHref })

    expect(memberHref).toHaveBeenCalledWith('user_alejandra')
    expect(screen.getByRole('link', { name: 'Alejandra Reyes' })).toHaveAttribute(
      'href',
      '/settings/users/user_alejandra'
    )
    expect(screen.getByRole('link', { name: 'Alejandra Reyes' })).toHaveClass(
      'font-medium',
      'text-sky-600',
      'hover:text-sky-700',
      'hover:underline',
      'dark:text-sky-400',
      'dark:hover:text-sky-300'
    )
  })

  it('renders status as a Badge', () => {
    renderPanel()

    expect(screen.getByText('Active')).toHaveAttribute('data-slot', 'badge')
  })

  it('formats the joined timestamp through the host formatter', () => {
    const { formatDate } = renderPanel()

    expect(formatDate).toHaveBeenCalledWith(1_783_771_200)
    expect(screen.getByText('11 Jul 2026')).toBeInTheDocument()
  })

  it('renders an em dash for a missing joined value', () => {
    renderPanel({
      members: [member({ joinedAt: null })],
      formatDate: (value) => (value === null ? '—' : 'formatted'),
    })

    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders an Empty title without a descriptive paragraph for an empty list', () => {
    renderPanel({ members: [] })

    expect(screen.getByText('No members hold this role')).toHaveAttribute(
      'data-slot',
      'empty-title'
    )
    expect(document.querySelector('[data-slot="empty-description"]')).toBeNull()
  })

  it('uses the supplied empty label', () => {
    renderPanel({ members: [], emptyLabel: 'No administrators' })

    expect(screen.getByText('No administrators')).toBeInTheDocument()
  })

  it('keeps column headers mounted for an error state', () => {
    renderPanel({
      members: [],
      state: {
        status: 'error',
        error: { code: 'billing/unavailable', message: 'Members are unavailable.' },
      },
    })

    expect(screen.getByText('Members are unavailable.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Member' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Status' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Joined' })).toBeInTheDocument()
  })

  it('keeps the standard table shell mounted for an error state', () => {
    renderPanel({
      members: [],
      state: {
        status: 'error',
        error: { code: 'billing/unavailable', message: 'Members are unavailable.' },
      },
    })

    expect(
      document.querySelector('[class~="876-card"][class~="overflow-hidden"]')
    ).not.toBeNull()
    expect(screen.getByRole('status')).toHaveTextContent('Members are unavailable.')
  })

  it('renders the loading skeleton with this table exact columns', () => {
    renderPanel({ members: [], state: { status: 'loading' } })

    expect(
      screen.getAllByRole('columnheader', { hidden: true }).map((header) => header.textContent)
    ).toEqual(ROLE_MEMBERS_SKELETON_COLUMNS.map((column) => column.label))
  })

  it('renders five skeleton body rows while loading', () => {
    renderPanel({ members: [], state: { status: 'loading' } })

    expect(screen.getAllByRole('row', { hidden: true })).toHaveLength(6)
  })

  it('renders sortable headers for every member column', () => {
    renderPanel()

    expect(screen.getByRole('button', { name: 'Member' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Status' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Joined' })).toBeInTheDocument()
  })

  it('uses an em dash for an empty member name and email', () => {
    renderPanel({ members: [member({ name: '', email: '' })] })

    expect(screen.getAllByText('—')).toHaveLength(2)
  })

  it('renders no Members section in the role card when members is omitted', () => {
    render(
      <RoleCardPanel
        role={role}
        surface={surface}
        canManage={false}
        closeHref="/settings/roles"
        onSave={vi.fn().mockResolvedValue({ error: null })}
        onDelete={vi.fn().mockResolvedValue({ error: null })}
      />
    )

    expect(screen.queryByText('Members')).not.toBeInTheDocument()
  })

  it.each(SECURITY_INPUTS)(
    'renders untrusted member names as text without creating markup: %s',
    (input) => {
      renderPanel({ members: [member({ name: input })] })

      expect(screen.getByRole('link')).toHaveTextContent(input)
      expect(document.querySelector('script')).toBeNull()
    }
  )

  it.each(SECURITY_INPUTS)(
    'renders untrusted member emails as text without creating markup: %s',
    (input) => {
      renderPanel({ members: [member({ email: input })] })

      expect(screen.getByText(input, { selector: 'p' })).toBeInTheDocument()
      expect(document.querySelector('script')).toBeNull()
    }
  )
})
