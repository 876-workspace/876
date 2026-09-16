/** @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DomainVerifyActions } from './domain-verify-actions'

const { verify } = vi.hoisted(() => ({ verify: vi.fn() }))
const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }))

vi.mock('@/lib/client/email', () => ({
  emailDomains: { verify },
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

describe('DomainVerifyActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    verify.mockResolvedValue({
      data: { object: 'email_domain', id: 'edom_1', status: 'verified' },
      error: null,
    })
  })

  it('renders nothing when every domain is already verified', () => {
    const { container } = render(
      <DomainVerifyActions
        organizationId="org_target"
        domains={[{ id: 'edom_1', name: 'acme.com', status: 'verified' }]}
      />
    )

    expect(container).toBeEmptyDOMElement()
    expect(verify).not.toHaveBeenCalled()
  })

  it('verifies the chosen domain with the exact organization and domain ids', async () => {
    const user = userEvent.setup()
    render(
      <DomainVerifyActions
        organizationId="org_target"
        domains={[
          { id: 'edom_1', name: 'acme.com', status: 'pending' },
          { id: 'edom_2', name: 'done.example', status: 'verified' },
        ]}
      />
    )

    expect(
      screen.getByRole('button', { name: 'Verify acme.com' })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Verify done.example' })
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Verify acme.com' }))

    expect(verify).toHaveBeenCalledTimes(1)
    expect(verify).toHaveBeenCalledWith('org_target', 'edom_1')
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
  })

  it('renders a verification failure inline without losing the action', async () => {
    verify.mockResolvedValue({
      data: null,
      error: {
        code: 'communications/unavailable',
        message: 'Try again later.',
      },
    })
    const user = userEvent.setup()
    render(
      <DomainVerifyActions
        organizationId="org_target"
        domains={[{ id: 'edom_1', name: 'acme.com', status: 'pending' }]}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Verify acme.com' }))

    expect(verify).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('Try again later.')).toBeInTheDocument()
    expect(refresh).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Verify acme.com' })
    ).toBeInTheDocument()
  })
})
