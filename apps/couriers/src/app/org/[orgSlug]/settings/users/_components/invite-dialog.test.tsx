/** @vitest-environment jsdom */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The permission matrix renders many controls and re-renders per interaction,
// so these exceed the default 5s under parallel-worker contention even though
// they pass comfortably in isolation.
vi.setConfig({ testTimeout: 20000 })

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  createInvite: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

vi.mock('@/lib/client', () => ({
  client: {
    team: {
      invites: { create: mocks.createInvite },
    },
  },
}))

import { InviteDialog } from './invite-dialog'

const roles = [
  { id: 'role_admin', name: 'Admin' },
  { id: 'role_staff', name: 'Staff' },
]

describe('InviteDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createInvite.mockResolvedValue({
      data: { id: 'invite_123' },
      error: null,
    })
  })

  it('shows the selected role label in the closed trigger', () => {
    render(
      <InviteDialog
        open
        onOpenChange={vi.fn()}
        orgSlug="island-logistics"
        roles={roles}
      />
    )

    expect(screen.getByRole('combobox', { name: 'Role' })).toHaveTextContent(
      'Admin'
    )
  })

  it('trims the email, posts the selected role, closes, and refreshes on success', async () => {
    const user = userEvent.setup({ delay: null })
    const onOpenChange = vi.fn()

    render(
      <InviteDialog
        open
        onOpenChange={onOpenChange}
        orgSlug="island-logistics"
        roles={roles}
      />
    )

    await user.type(screen.getByLabelText('Email'), '  alejandra@example.com ')
    await user.click(screen.getByRole('button', { name: 'Invite' }))

    await waitFor(() => {
      expect(mocks.createInvite).toHaveBeenCalledTimes(1)
    })
    expect(mocks.createInvite).toHaveBeenCalledWith('island-logistics', {
      email: 'alejandra@example.com',
      roleId: 'role_admin',
    })
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
      expect(mocks.refresh).toHaveBeenCalledTimes(1)
    })
  })

  it('surfaces invite errors and keeps the dialog open without refreshing', async () => {
    const user = userEvent.setup({ delay: null })
    const onOpenChange = vi.fn()
    mocks.createInvite.mockResolvedValue({
      data: null,
      error: {
        code: 'invite/failed',
        message: 'Invite could not be sent.',
      },
    })

    render(
      <InviteDialog
        open
        onOpenChange={onOpenChange}
        orgSlug="island-logistics"
        roles={roles}
      />
    )

    await user.type(screen.getByLabelText('Email'), 'alejandra@example.com')
    await user.click(screen.getByRole('button', { name: 'Invite' }))

    expect(await screen.findByText('Invite could not be sent.')).toBeVisible()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    expect(mocks.refresh).not.toHaveBeenCalled()
  })
})
