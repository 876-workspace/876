import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  request: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}))
vi.mock('@/lib/client/request', () => ({ request: mocks.request }))

import { OrganizationSetup } from './organization-setup'

describe('OrganizationSetup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.request.mockResolvedValue({
      data: {
        object: 'onboarding_organization',
        organization_id: 'organization_123',
      },
      error: null,
    })
  })

  it('creates the workspace through the same-origin onboarding route', async () => {
    const user = userEvent.setup()
    render(<OrganizationSetup />)

    await user.type(screen.getByLabelText('Workspace name'), 'Acme Logistics')
    await user.click(screen.getByRole('button', { name: 'Create workspace' }))

    expect(mocks.request).toHaveBeenCalledWith('/api/onboarding/organization', {
      method: 'POST',
      body: JSON.stringify({ name: 'Acme Logistics' }),
    })
    expect(mocks.replace).toHaveBeenCalledWith('/')
    expect(mocks.refresh).toHaveBeenCalled()
  })

  it('keeps the form visible when bootstrap reports an error', async () => {
    mocks.request.mockResolvedValue({
      data: null,
      error: {
        code: 'provisioning/finance-workspace-unavailable',
        message: 'Workspace setup is temporarily unavailable.',
      },
    })
    const user = userEvent.setup()
    render(<OrganizationSetup />)

    await user.type(screen.getByLabelText('Workspace name'), 'Acme Logistics')
    await user.click(screen.getByRole('button', { name: 'Create workspace' }))

    expect(
      await screen.findByText('Workspace setup is temporarily unavailable.')
    ).toBeInTheDocument()
    expect(mocks.replace).not.toHaveBeenCalled()
  })

  it('returns a stale session to Enterprise login', async () => {
    mocks.request.mockResolvedValue({
      data: null,
      error: {
        code: 'auth/session-invalid',
        message: 'Your session is no longer valid. Please sign in again.',
      },
    })
    const user = userEvent.setup()
    render(<OrganizationSetup />)

    await user.type(screen.getByLabelText('Workspace name'), 'Acme Logistics')
    await user.click(screen.getByRole('button', { name: 'Create workspace' }))

    expect(mocks.replace).toHaveBeenCalledWith('/login?returnTo=%2Fonboarding')
    expect(mocks.refresh).toHaveBeenCalled()
  })
})
