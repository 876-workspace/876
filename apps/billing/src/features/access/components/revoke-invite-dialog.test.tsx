/** @vitest-environment jsdom */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  revoke: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))
vi.mock('@/lib/client', () => ({
  client: { invites: { revoke: mocks.revoke } },
}))

import { RevokeInviteDialog } from './revoke-invite-dialog'

describe('RevokeInviteDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.revoke.mockResolvedValue({ data: { id: 'invite_123' }, error: null })
  })

  it('revokes the selected invite when confirmed', async () => {
    const user = userEvent.setup()
    render(<RevokeInviteDialog inviteId="invite_123" email="ada@example.com" />)

    await user.click(screen.getByRole('button', { name: 'Revoke' }))
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Revoke',
      })
    )

    await waitFor(() => expect(mocks.revoke).toHaveBeenCalledWith('invite_123'))
    expect(mocks.revoke).toHaveBeenCalledTimes(1)
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })

  it('does not revoke the invite when cancelled', async () => {
    const user = userEvent.setup()
    render(<RevokeInviteDialog inviteId="invite_123" email="ada@example.com" />)

    await user.click(screen.getByRole('button', { name: 'Revoke' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(mocks.revoke).not.toHaveBeenCalled()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })
})
