/** @vitest-environment jsdom */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { RoleResource } from '@/types/access'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  push: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}))
vi.mock('@/lib/client', () => ({
  client: { invites: { create: mocks.create } },
}))

import { InviteForm } from './invite-form'

const roles: RoleResource[] = [
  {
    object: 'billing_role' as const,
    id: 'role_admin',
    slug: 'admin',
    name: 'Administrator',
    description: '',
    permissions: ['billing:access'],
    isSystem: true,
    isDefault: false,
    memberCount: 1,
    createdAt: 0,
    updatedAt: 0,
  },
]

describe('InviteForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.create.mockResolvedValue({ data: { id: 'invite_123' }, error: null })
  })

  it('submits the email and selected role', async () => {
    const user = userEvent.setup()
    render(<InviteForm roles={roles} />)

    await user.type(screen.getByLabelText('Email address'), 'ada@example.com')
    await user.click(screen.getByRole('button', { name: 'Send invite' }))

    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith({
        email: 'ada@example.com',
        role: 'admin',
      })
    )
    expect(mocks.create).toHaveBeenCalledTimes(1)
    expect(mocks.push).toHaveBeenCalledWith('/settings/users')
    expect(mocks.push).toHaveBeenCalledTimes(1)
  })

  it('does not submit when the email is empty', async () => {
    const user = userEvent.setup()
    render(<InviteForm roles={roles} />)

    await user.click(screen.getByRole('button', { name: 'Send invite' }))

    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it('shows an invite error without navigating', async () => {
    const user = userEvent.setup()
    mocks.create.mockResolvedValue({
      data: null,
      error: { code: 'error/bad-request', message: 'Invite already exists.' },
    })
    render(<InviteForm roles={roles} />)

    await user.type(screen.getByLabelText('Email address'), 'ada@example.com')
    await user.click(screen.getByRole('button', { name: 'Send invite' }))

    expect(await screen.findByText('Invite already exists.')).toBeTruthy()
    expect(mocks.create).toHaveBeenCalledWith({
      email: 'ada@example.com',
      role: 'admin',
    })
    expect(mocks.create).toHaveBeenCalledTimes(1)
    expect(mocks.push).not.toHaveBeenCalled()
  })
})
