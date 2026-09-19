import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ evaluate: vi.fn() }))

vi.mock('@/lib/clients/workspace', () => ({
  workspace: { features: { evaluate: mocks.evaluate } },
}))
vi.mock('@sentry/nextjs', () => ({ captureMessage: vi.fn() }))
vi.mock('server-only', () => ({}))

import { findAppWorkspace } from './app-workspaces'
import { resolveWorkspaceNavigation } from './workspace-navigation'

const BILLING = findAppWorkspace('billing')!
const INVOICE = findAppWorkspace('invoice')!
const CRM = findAppWorkspace('crm')!

function enabled(...slugs: string[]) {
  return {
    data: { data: slugs.map((slug) => ({ slug })) },
    error: null,
  }
}

async function labels(workspace = BILLING) {
  const links = await resolveWorkspaceNavigation('acme', 'org_1', workspace)
  return links.map((link) => link.label)
}

describe('resolveWorkspaceNavigation', () => {
  beforeEach(() => vi.clearAllMocks())

  it('evaluates flags for the organization, never for the operator', async () => {
    mocks.evaluate.mockResolvedValue(enabled())
    await resolveWorkspaceNavigation('acme', 'org_1', BILLING)

    expect(mocks.evaluate).toHaveBeenCalledTimes(1)
    expect(mocks.evaluate).toHaveBeenCalledWith({
      appSlug: '876-billing',
      organizationId: 'org_1',
    })
  })

  it('shows the sections that need no feature flag, in registry order', async () => {
    mocks.evaluate.mockResolvedValue(enabled())

    expect(await labels()).toEqual(['Overview', 'Customers', 'Items'])
  })

  it('hides Subscriptions from an org without the subscriptions flag', async () => {
    mocks.evaluate.mockResolvedValue(enabled())

    expect(await labels()).not.toContain('Subscriptions')
  })

  it('shows Subscriptions once the org has the flag', async () => {
    mocks.evaluate.mockResolvedValue(enabled('billing-subscriptions'))

    expect(await labels()).toContain('Subscriptions')
  })

  it('builds hrefs under the organization workspace, not the product app', async () => {
    mocks.evaluate.mockResolvedValue(enabled())
    const links = await resolveWorkspaceNavigation('acme', 'org_1', BILLING)

    // Registry order, so the operator rail reads like the product's own sidebar.
    expect(links.map((link) => link.href)).toEqual([
      '/workspace/acme/billing',
      '/workspace/acme/billing/customers',
      '/workspace/acme/billing/items',
    ])
  })

  it('marks only the index section exact so it does not stay active', async () => {
    mocks.evaluate.mockResolvedValue(enabled())
    const links = await resolveWorkspaceNavigation('acme', 'org_1', BILLING)

    expect(links.filter((link) => link.exact)).toHaveLength(1)
    expect(links.find((link) => link.exact)?.label).toBe('Overview')
  })

  it('resolves the Invoice workspace against the Invoice app slug', async () => {
    mocks.evaluate.mockResolvedValue(enabled())
    await resolveWorkspaceNavigation('acme', 'org_1', INVOICE)

    expect(mocks.evaluate).toHaveBeenCalledWith({
      appSlug: '876-invoice',
      organizationId: 'org_1',
    })
  })

  it('lists the Invoice sections Console implements', async () => {
    mocks.evaluate.mockResolvedValue(enabled())

    // Invoice's registry lists Items in its workspace group, before the sales
    // group that holds Invoices, so the rail follows the app.
    expect(await labels(INVOICE)).toEqual([
      'Overview',
      'Customers',
      'Items',
      'Invoices',
      'Payments',
    ])
  })

  it('hides Billing invoices and payments without the sales feature', async () => {
    mocks.evaluate.mockResolvedValue(enabled())

    const shown = await labels()
    expect(shown).not.toContain('Invoices')
    expect(shown).not.toContain('Payments')
  })

  it('shows the sales children the organization has, under the parent flag', async () => {
    // Invoices and Payments are children of the `sales` group entry, so the
    // rail can only reach them by walking children — the regression this
    // guards is a flat top-level-only walk putting them permanently out of
    // reach.
    mocks.evaluate.mockResolvedValue(
      enabled('billing-sales', 'billing-sales-invoices')
    )

    expect(await labels()).toEqual([
      'Overview',
      'Customers',
      'Items',
      'Invoices',
      'Payments',
    ])
  })

  it('hides Banking from an org without the banking flag', async () => {
    mocks.evaluate.mockResolvedValue(enabled())

    expect(await labels()).not.toContain('Banking')
  })

  it('shows Banking once the org has the flag', async () => {
    mocks.evaluate.mockResolvedValue(enabled('billing-banking'))

    expect(await labels()).toContain('Banking')
  })

  it('fails closed to no sections when flag evaluation is unavailable', async () => {
    mocks.evaluate.mockResolvedValue({
      data: null,
      error: { code: 'platform/unavailable', message: 'down' },
    })

    expect(await labels()).toEqual(['Overview', 'Customers', 'Items'])
  })

  it('returns nothing for a workspace whose registry has not moved yet', async () => {
    mocks.evaluate.mockResolvedValue(enabled())

    expect(await resolveWorkspaceNavigation('acme', 'org_1', CRM)).toEqual([])
    expect(mocks.evaluate).not.toHaveBeenCalled()
  })
})
