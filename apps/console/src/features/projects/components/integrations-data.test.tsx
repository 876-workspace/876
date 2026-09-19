// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const mocks = vi.hoisted(() => ({
  listClients: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  usePathname: () => '/projects/integrations',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/clients/projects', () => ({
  projects: {
    integrationClients: { list: mocks.listClients },
  },
}))

import { IntegrationsData } from './integrations-data'

function makeServiceClient(overrides = {}) {
  return {
    object: 'projects.integration-client',
    id: 'intc_1',
    tenantId: 'prjten_1',
    organizationId: 'org_1',
    name: 'CI sync',
    scopes: ['projects:read'],
    keyPrefix: 'abcd1234',
    lastUsedAt: null,
    revokedAt: null,
    createdAt: 1700000000,
    updatedAt: 1700000000,
    ...overrides,
  }
}

afterEach(cleanup)

describe('IntegrationsData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.listClients.mockResolvedValue({
      data: [makeServiceClient()],
      error: null,
    })
  })

  it('fetches integration clients for the host organization', async () => {
    render(
      await IntegrationsData({ organizationId: 'org_1', base: '/projects' })
    )

    expect(mocks.listClients).toHaveBeenCalledWith('org_1')
  })

  it('renders client names with scopes', async () => {
    render(
      await IntegrationsData({ organizationId: 'org_1', base: '/projects' })
    )

    expect(screen.getByText('CI sync')).toBeInTheDocument()
    expect(screen.getByText('projects:read')).toBeInTheDocument()
  })

  it('never renders secrets or key prefixes', async () => {
    const { container } = render(
      await IntegrationsData({ organizationId: 'org_1', base: '/projects' })
    )

    expect(container.textContent).not.toContain('abcd1234')
    expect(container.textContent).not.toContain('secret')
  })

  it('hides revoke affordances in the read-only operator view', async () => {
    render(
      await IntegrationsData({ organizationId: 'org_1', base: '/projects' })
    )

    expect(
      screen.queryByRole('button', { name: 'Revoke' })
    ).not.toBeInTheDocument()
  })

  it('surfaces a banner when clients cannot be loaded', async () => {
    mocks.listClients.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'boom' },
    })

    render(
      await IntegrationsData({ organizationId: 'org_1', base: '/projects' })
    )

    expect(
      screen.getByText('Integration data could not be loaded')
    ).toBeInTheDocument()
  })

  it('shows the shared empty state when no clients exist', async () => {
    mocks.listClients.mockResolvedValue({ data: [], error: null })

    render(
      await IntegrationsData({ organizationId: 'org_1', base: '/projects' })
    )

    expect(screen.getByText('No integration clients yet')).toBeInTheDocument()
  })
})
