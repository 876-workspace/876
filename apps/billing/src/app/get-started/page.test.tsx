/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  getPlatformClient: vi.fn(),
  getContext: vi.fn(),
  requireValidSession: vi.fn(),
  retrieveOrganization: vi.fn(),
  setupButton: vi.fn(),
}))

vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('@876/ui/page', () => ({
  PageDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  PageHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PageTitle: ({ children }: { children: ReactNode }) => <h1>{children}</h1>,
}))
vi.mock('@/lib/services/platform', () => ({
  getPlatformClient: mocks.getPlatformClient,
}))
vi.mock('@/lib/auth/billing-context', () => ({ getContext: mocks.getContext }))
vi.mock('@/lib/auth/guards', () => ({
  requireValidSession: mocks.requireValidSession,
}))
vi.mock('./_components/create-organization', () => ({
  CreateOrganization: () => <div>Create organization</div>,
}))
vi.mock('./_components/setup-button', () => ({
  SetupButton: (props: Record<string, unknown>) => {
    mocks.setupButton(props)
    return <button type="button">Activate 876 Billing</button>
  },
}))

import GetStartedPage from './page'

describe('GetStartedPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireValidSession.mockResolvedValue({
      id: 'user_123',
      firstName: 'Alejandra',
      lastName: 'Reyes',
    })
    mocks.getPlatformClient.mockResolvedValue({
      currencies: { list: vi.fn() },
      organizations: { retrieve: mocks.retrieveOrganization },
    })
    mocks.getContext.mockResolvedValue({
      orgId: 'org_123',
      orgName: 'Island Logistics',
      orgSlug: 'island-logistics',
      role: 'owner',
      tenant: { id: 'tenant_123', name: 'Island Logistics' },
      accessStatus: 'none',
    })
  })

  it('renders activation for an existing workspace without a Billing entitlement', async () => {
    const page = await GetStartedPage()
    render(page)

    expect(
      screen.getByRole('heading', { name: 'Activate 876 Billing' })
    ).toBeVisible()
    expect(
      screen.getByText(
        'Your organization’s financial data is ready. Activate Billing to open the application.'
      )
    ).toBeVisible()
    expect(
      screen.queryByRole('heading', { name: 'Set up your workspace' })
    ).not.toBeInTheDocument()
    expect(mocks.redirect).not.toHaveBeenCalled()
    expect(mocks.setupButton).toHaveBeenCalledTimes(1)
    // Activation only — the existing workspace already fixed its currency, so
    // the activate card is not handed one it would never use.
    expect(mocks.setupButton).toHaveBeenCalledWith({ workspaceExists: true })
    expect(mocks.retrieveOrganization).not.toHaveBeenCalled()
  })
})
