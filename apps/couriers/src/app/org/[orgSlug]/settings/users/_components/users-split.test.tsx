/** @vitest-environment jsdom */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { TeamMemberRow, TeamRoleOption } from '@/types/team'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  searchParams: new URLSearchParams(),
  update: vi.fn(),
  del: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
  useSearchParams: () => mocks.searchParams,
}))

vi.mock('@/lib/client', () => ({
  client: {
    team: {
      update: mocks.update,
      delete: mocks.del,
    },
  },
}))

import { UsersSplit } from './users-split'

const roles: TeamRoleOption[] = [
  {
    id: 'role_admin',
    name: 'Admin',
    permissions: ['items.view', 'settings.view'],
    systemKey: 'admin',
  },
  {
    id: 'role_staff',
    name: 'Staff',
    permissions: ['items.view'],
    systemKey: 'staff',
  },
]

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

describe('UsersSplit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.searchParams = new URLSearchParams()
    mocks.update.mockResolvedValue({ data: rows[0], error: null })
    mocks.del.mockResolvedValue({
      data: { id: 'tmem_alejandra', deleted: true },
      error: null,
    })
  })

  it('shows the empty state when the tenant has no team grants', () => {
    render(<UsersSplit rows={[]} roles={roles} orgSlug="island-logistics" />)

    expect(screen.getByText('No users.')).toBeVisible()
  })

  it('opens the detail panel for the selected member from the URL', () => {
    render(
      <UsersSplit
        rows={rows}
        roles={roles}
        selectedId="tmem_alejandra"
        orgSlug="island-logistics"
      />
    )

    expect(
      screen.getByRole('heading', { name: 'Alejandra Reyes' })
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Deactivate' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Remove' })).toBeVisible()
    expect(screen.getByRole('tab', { name: 'Permissions' })).toBeVisible()
    expect(screen.getByRole('tab', { name: 'Activity' })).toBeVisible()
  })

  it('deactivates the selected member through the typed client and refreshes', async () => {
    const user = userEvent.setup()

    render(
      <UsersSplit
        rows={rows}
        roles={roles}
        selectedId="tmem_alejandra"
        orgSlug="island-logistics"
      />
    )

    await user.click(screen.getByRole('button', { name: 'Deactivate' }))

    await waitFor(() => {
      expect(mocks.update).toHaveBeenCalledTimes(1)
    })
    expect(mocks.update).toHaveBeenCalledWith(
      'island-logistics',
      'tmem_alejandra',
      { status: 'inactive' }
    )
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })

  it('surfaces last-admin lockout errors without refreshing', async () => {
    const user = userEvent.setup()
    mocks.update.mockResolvedValue({
      data: null,
      error: {
        code: 'team/last-active-admin',
        message:
          'The last active Admin team member cannot be removed or reassigned.',
      },
    })

    render(
      <UsersSplit
        rows={rows}
        roles={roles}
        selectedId="tmem_alejandra"
        orgSlug="island-logistics"
      />
    )

    await user.click(screen.getByRole('button', { name: 'Deactivate' }))

    expect(
      await screen.findByText(
        'The last active Admin team member cannot be removed or reassigned.'
      )
    ).toBeVisible()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  it('clears the user selection when the detail panel is closed', async () => {
    const user = userEvent.setup()

    render(
      <UsersSplit
        rows={rows}
        roles={roles}
        selectedId="tmem_alejandra"
        orgSlug="island-logistics"
      />
    )

    await user.click(screen.getByRole('button', { name: 'Close user details' }))

    expect(mocks.push).toHaveBeenCalledWith(
      '/org/island-logistics/settings/users'
    )
  })
})
