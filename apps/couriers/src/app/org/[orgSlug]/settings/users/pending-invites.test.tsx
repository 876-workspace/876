/** @vitest-environment jsdom */

import { render, screen, waitFor } from '@testing-library/react'
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
  client: {
    team: {
      invites: { revoke: mocks.revoke },
    },
  },
}))

import { PendingInvites } from './pending-invites'

const invites = [
  {
    id: 'invite_123',
    email: 'alejandra@example.com',
    role: 'admin',
    expiresAt: 1_784_419_200,
  },
]

describe('PendingInvites', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.revoke.mockResolvedValue({
      data: { id: 'invite_123', status: 'revoked' },
      error: null,
    })
  })

  it('renders nothing when the org has no pending invites', () => {
    const { container } = render(
      <PendingInvites orgSlug="island-logistics" invites={[]} />
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('revokes a pending invite and refreshes the page data', async () => {
    const user = userEvent.setup()

    render(<PendingInvites orgSlug="island-logistics" invites={invites} />)

    await user.click(screen.getByRole('button', { name: 'Revoke' }))

    await waitFor(() => {
      expect(mocks.revoke).toHaveBeenCalledTimes(1)
    })
    expect(mocks.revoke).toHaveBeenCalledWith('island-logistics', 'invite_123')
    await waitFor(() => {
      expect(mocks.refresh).toHaveBeenCalledTimes(1)
    })
  })

  it('keeps the row and shows the error when revoke fails', async () => {
    const user = userEvent.setup()
    mocks.revoke.mockResolvedValue({
      data: null,
      error: {
        code: 'invite/not_found',
        message: 'Invite not found.',
      },
    })

    render(<PendingInvites orgSlug="island-logistics" invites={invites} />)

    await user.click(screen.getByRole('button', { name: 'Revoke' }))

    expect(await screen.findByText('Invite not found.')).toBeVisible()
    expect(screen.getByText('alejandra@example.com')).toBeVisible()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })
})
