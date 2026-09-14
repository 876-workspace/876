/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { TeamMemberRow } from '@/types/team'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  searchParams: new URLSearchParams(),
  segments: [] as string[],
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
  useSearchParams: () => mocks.searchParams,
  useSelectedLayoutSegments: () => mocks.segments,
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string
    children: React.ReactNode
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

import { UsersList } from './users-list'

const rows: TeamMemberRow[] = [
  {
    id: 'tmem_alejandra',
    userId: 'usr_alejandra',
    name: 'Alejandra Reyes',
    email: 'alejandra@example.com',
    avatar: null,
    roleId: 'role_admin',
    roleName: 'Admin',
    roleSystemKey: 'admin',
    status: 'active',
    createdAt: 1_784_419_200,
  },
  {
    id: 'tmem_malik',
    userId: 'usr_malik',
    name: 'Malik Brown',
    email: 'malik@example.com',
    avatar: null,
    roleId: 'role_staff',
    roleName: 'Staff',
    roleSystemKey: 'staff',
    status: 'inactive',
    createdAt: 1_784_419_200,
  },
]

describe('UsersList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.searchParams = new URLSearchParams()
    mocks.segments = []
  })

  it('renders the full-width table with the pending section while closed', () => {
    render(
      <UsersList
        rows={rows}
        orgSlug="island-logistics"
        pending={<div>Pending invites</div>}
      />
    )

    expect(screen.getByText('Role')).toBeVisible()
    expect(screen.getByText('Status')).toBeVisible()
    expect(screen.getByText('Alejandra Reyes')).toBeVisible()
    expect(screen.getByText('Malik Brown')).toBeVisible()
    expect(screen.getByText('Pending invites')).toBeVisible()
  })

  it('navigates to the member route preserving the status filter', async () => {
    const user = userEvent.setup()
    mocks.searchParams = new URLSearchParams('status=active')

    render(<UsersList rows={rows} orgSlug="island-logistics" />)

    await user.click(screen.getByText('Alejandra Reyes'))

    expect(mocks.push).toHaveBeenCalledWith(
      '/island-logistics/settings/users/tmem_alejandra?status=active'
    )
  })

  it('renders the condensed list with the selection marked while open', () => {
    mocks.segments = ['tmem_alejandra']

    render(<UsersList rows={rows} orgSlug="island-logistics" />)

    expect(screen.queryByText('Role')).not.toBeInTheDocument()
    const selected = screen.getByRole('link', {
      name: 'View user Alejandra Reyes',
    })
    expect(selected).toHaveAttribute('aria-current', 'true')
    expect(selected).toHaveAttribute(
      'href',
      '/island-logistics/settings/users/tmem_alejandra'
    )
    expect(
      screen.getByRole('link', { name: 'View user Malik Brown' })
    ).not.toHaveAttribute('aria-current')
  })

  it('filters rows by the status query param', () => {
    mocks.searchParams = new URLSearchParams('status=inactive')

    render(<UsersList rows={rows} orgSlug="island-logistics" />)

    expect(screen.queryByText('Alejandra Reyes')).not.toBeInTheDocument()
    expect(screen.getByText('Malik Brown')).toBeVisible()
  })

  it('ignores an unknown status value', () => {
    mocks.searchParams = new URLSearchParams('status=suspended')

    render(<UsersList rows={rows} orgSlug="island-logistics" />)

    expect(screen.getByText('Alejandra Reyes')).toBeVisible()
    expect(screen.getByText('Malik Brown')).toBeVisible()
  })

  it('shows the empty state when the tenant has no team grants', () => {
    render(<UsersList rows={[]} orgSlug="island-logistics" />)

    expect(screen.getByText('No users.')).toBeVisible()
  })
})
