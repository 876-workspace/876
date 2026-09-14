/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { RoleView } from '@/types/role'

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

import { RolesList } from './roles-list'

function createRole(overrides: Partial<RoleView> = {}): RoleView {
  return {
    id: 'role_dispatcher',
    name: 'Dispatcher',
    description: 'Coordinates parcels.',
    permissions: ['packages.view'],
    isDefault: false,
    systemKey: null,
    memberCount: 3,
    createdAt: 1_784_419_200,
    updatedAt: 1_784_419_200,
    ...overrides,
  }
}

const roles: RoleView[] = [
  createRole(),
  createRole({
    id: 'role_admin',
    name: 'Admin',
    description: 'Full access.',
    permissions: ['items.view'],
    isDefault: true,
    systemKey: 'admin',
    memberCount: 1,
  }),
]

describe('RolesList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.searchParams = new URLSearchParams()
    mocks.segments = []
  })

  it('renders the full-width table while closed', () => {
    render(<RolesList orgSlug="island-logistics" roles={roles} />)

    expect(screen.getByText('Name')).toBeVisible()
    expect(screen.getByText('Description')).toBeVisible()
    expect(screen.getByText('Members')).toBeVisible()
    expect(screen.getByText('Dispatcher')).toBeVisible()
    expect(screen.getByText('Admin')).toBeVisible()
  })

  it('navigates to the role route preserving the type filter', async () => {
    const user = userEvent.setup()
    mocks.searchParams = new URLSearchParams('type=custom')

    render(<RolesList orgSlug="island-logistics" roles={roles} />)

    await user.click(screen.getByText('Dispatcher'))

    expect(mocks.push).toHaveBeenCalledWith(
      '/island-logistics/settings/users/roles/role_dispatcher?type=custom'
    )
  })

  it('renders the condensed list with the selection marked while open', () => {
    mocks.segments = ['role_admin']

    render(<RolesList orgSlug="island-logistics" roles={roles} />)

    expect(screen.queryByText('Members')).not.toBeInTheDocument()
    const selected = screen.getByRole('link', { name: 'View Admin role' })
    expect(selected).toHaveAttribute('aria-current', 'true')
    expect(
      screen.getByRole('link', { name: 'View Dispatcher role' })
    ).not.toHaveAttribute('aria-current')
  })

  it('filters system roles by the type query param', () => {
    mocks.searchParams = new URLSearchParams('type=system')

    render(<RolesList orgSlug="island-logistics" roles={roles} />)

    expect(screen.queryByText('Dispatcher')).not.toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeVisible()
  })

  it('filters custom roles by the type query param', () => {
    mocks.searchParams = new URLSearchParams('type=custom')

    render(<RolesList orgSlug="island-logistics" roles={roles} />)

    expect(screen.getByText('Dispatcher')).toBeVisible()
    expect(screen.queryByText('Admin')).not.toBeInTheDocument()
  })

  it('ignores an unknown type value', () => {
    mocks.searchParams = new URLSearchParams('type=archived')

    render(<RolesList orgSlug="island-logistics" roles={roles} />)

    expect(screen.getByText('Dispatcher')).toBeVisible()
    expect(screen.getByText('Admin')).toBeVisible()
  })
})
