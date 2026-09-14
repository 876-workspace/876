/** @vitest-environment jsdom */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { TeamMemberRow, TeamRoleOption } from '@/types/team'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  update: vi.fn(),
  del: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
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

vi.mock('@/lib/client', () => ({
  client: {
    team: {
      update: mocks.update,
      delete: mocks.del,
    },
  },
}))

import { UserDetailCard } from './user-detail'

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

const row: TeamMemberRow = {
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
}

function renderCard() {
  return render(
    <UserDetailCard
      row={row}
      roles={roles}
      orgSlug="island-logistics"
      closeHref="/island-logistics/settings/users?status=active"
    />
  )
}

describe('UserDetailCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.update.mockResolvedValue({ data: row, error: null })
    mocks.del.mockResolvedValue({
      data: { id: 'tmem_alejandra', deleted: true },
      error: null,
    })
  })

  it('renders the member card with tabs and a close link preserving the filter', () => {
    renderCard()

    expect(
      screen.getByRole('heading', { name: 'Alejandra Reyes' })
    ).toBeVisible()
    expect(screen.getByText('Active')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Deactivate' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Remove' })).toBeVisible()
    expect(screen.getByRole('tab', { name: 'Permissions' })).toBeVisible()
    expect(screen.getByRole('tab', { name: 'Activity' })).toBeVisible()
    expect(
      screen.getByRole('link', { name: 'Close user details' })
    ).toHaveAttribute('href', '/island-logistics/settings/users?status=active')
  })

  it('deactivates the member through the typed client and refreshes', async () => {
    const user = userEvent.setup()

    renderCard()

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

    renderCard()

    await user.click(screen.getByRole('button', { name: 'Deactivate' }))

    expect(
      await screen.findByText(
        'The last active Admin team member cannot be removed or reassigned.'
      )
    ).toBeVisible()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  it('removes the member through the confirm dialog and returns to the list', async () => {
    const user = userEvent.setup()

    renderCard()

    await user.click(screen.getByRole('button', { name: 'Remove' }))
    expect(await screen.findByText('Remove user?')).toBeVisible()
    // The open dialog marks the card inert, so the only exposed Remove
    // button is the confirm action itself.
    await user.click(screen.getByRole('button', { name: 'Remove' }))

    await waitFor(() => {
      expect(mocks.del).toHaveBeenCalledTimes(1)
    })
    expect(mocks.del).toHaveBeenCalledWith('island-logistics', 'tmem_alejandra')
    expect(mocks.push).toHaveBeenCalledWith('/island-logistics/settings/users')
  })
})
