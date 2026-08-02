/** @vitest-environment jsdom */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  push: vi.fn(),
  useUsernameAvailability: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}))
vi.mock('@/hooks/use-username-availability', () => ({
  useUsernameAvailability: mocks.useUsernameAvailability,
}))
vi.mock('@/lib/client', () => ({
  client: { users: { create: mocks.create } },
}))

import { CreateUserForm } from './create-user-form'

describe('Create user form', () => {
  beforeEach(() => {
    mocks.useUsernameAvailability.mockReturnValue({ status: 'idle' })
  })

  it('when required fields are empty, explains the requirement without sending a request', async () => {
    const user = userEvent.setup()
    render(<CreateUserForm />)

    await user.click(screen.getByRole('button', { name: 'Create User' }))

    expect(
      screen.getByText('First name, last name, and email are required.')
    ).toBeVisible()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('when all fields are valid, sends normalized account data and opens the new user', async () => {
    const user = userEvent.setup()
    mocks.useUsernameAvailability.mockReturnValue({
      status: 'available',
      message: 'Username is available.',
    })
    mocks.create.mockResolvedValue({
      data: { id: 'usr_123', username: 'zoe-hart' },
      error: null,
    })
    render(<CreateUserForm />)

    await user.type(screen.getByLabelText(/First Name/), '  Zoë ')
    await user.type(screen.getByLabelText(/Last Name/), ' Hart ')
    await user.type(screen.getByLabelText(/Email/), ' zoe@example.com ')
    await user.click(
      screen.getByRole('button', { name: 'Show optional fields' })
    )
    await user.type(screen.getByLabelText('Middle Name'), ' Amara ')
    await user.type(screen.getByLabelText('Username'), ' zoe-hart ')
    await user.type(screen.getByLabelText('Organization Name'), ' Studio 876 ')
    await user.click(screen.getByRole('button', { name: 'Create User' }))

    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith({
        email: 'zoe@example.com',
        first_name: 'Zoë',
        last_name: 'Hart',
        middle_name: 'Amara',
        username: 'zoe-hart',
        organization_name: 'Studio 876',
      })
    )
    expect(mocks.push).toHaveBeenCalledWith('/users/zoe-hart')
  })

  it('when the username is unavailable, shows the verdict and blocks creation', async () => {
    const user = userEvent.setup()
    mocks.useUsernameAvailability.mockReturnValue({
      status: 'unavailable',
      message: 'That username is reserved.',
    })
    render(<CreateUserForm />)

    await user.type(screen.getByLabelText(/First Name/), 'Maya')
    await user.type(screen.getByLabelText(/Last Name/), 'Brown')
    await user.type(screen.getByLabelText(/Email/), 'maya@example.com')
    await user.click(screen.getByRole('button', { name: 'Create User' }))

    expect(screen.getByText('That username is reserved.')).toBeVisible()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('when creation fails, keeps the form visible and shows the service error', async () => {
    const user = userEvent.setup()
    mocks.create.mockResolvedValue({
      data: null,
      error: { message: 'An account already uses that email.' },
    })
    render(<CreateUserForm />)

    await user.type(screen.getByLabelText(/First Name/), 'Aaliyah')
    await user.type(screen.getByLabelText(/Last Name/), 'Morgan')
    await user.type(screen.getByLabelText(/Email/), 'aaliyah@example.com')
    await user.click(screen.getByRole('button', { name: 'Create User' }))

    expect(
      await screen.findByText('An account already uses that email.')
    ).toBeVisible()
    expect(mocks.push).not.toHaveBeenCalled()
  })
})
