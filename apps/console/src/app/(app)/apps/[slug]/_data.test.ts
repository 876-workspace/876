import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  listAppSubscriptions: vi.fn(),
  listOrganizationSubscriptions: vi.fn(),
}))

vi.mock('@/lib/services/workspace', () => ({
  workspace: {
    apps: {
      entitlements: { list: mocks.listAppSubscriptions },
    },
    organizations: {
      subscriptions: { list: mocks.listOrganizationSubscriptions },
    },
  },
}))

vi.mock('@/lib/apps-catalog', () => ({
  listConsoleApps: vi.fn(),
}))

import { listCompleteAppSubscriptions } from './_data'

const summary = {
  object: 'subscription',
  id: 'sub_invoice',
  organization_id: 'org_test',
  app_id: 'app_invoice',
  status: 'active',
  created_at: 1,
  updated_at: 2,
}

const hydrated = {
  ...summary,
  billing_account_id: null,
  app_slug: '876-invoice',
  app_name: '876 Invoice',
  app_logo_url: null,
  app_kind: 'product',
  provider_status: null,
  status_reason: null,
  finance_lifecycle_version: 1,
  collection_method: 'charge_automatically',
  billing_cycle_anchor: null,
  items: [
    {
      object: 'subscription_item',
      id: 'si_invoice',
      price_id: 'prc_free',
      product_id: 'prd_invoice_free',
      product_slug: '876-invoice-free',
      product_name: '876 Invoice Free',
      quantity: 1,
      billing_thresholds: null,
      metadata: null,
    },
  ],
  current_period_start: null,
  current_period_end: null,
  cancel_at: null,
  cancel_at_period_end: false,
  canceled_at: null,
  ended_at: null,
  pause_collection: null,
  trial_start: null,
  trial_end: null,
  start_date: 1,
  default_payment_method_id: null,
  latest_invoice_id: null,
  pending_update: null,
  schedule_id: null,
  metadata: null,
}

describe('listCompleteAppSubscriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.listAppSubscriptions.mockResolvedValue({
      data: [summary],
      error: null,
    })
  })

  afterEach(() => vi.restoreAllMocks())

  it('hydrates the lightweight app subscription response with canonical items', async () => {
    mocks.listOrganizationSubscriptions.mockResolvedValue({
      data: { object: 'list', data: [hydrated], total_count: 1 },
      error: null,
    })

    const result = await listCompleteAppSubscriptions('app_invoice')

    expect(mocks.listOrganizationSubscriptions).toHaveBeenCalledWith({
      organizationIds: ['org_test'],
    })
    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(1)
    expect(result.data[0]?.items[0]).toMatchObject({
      product_id: 'prd_invoice_free',
      price_id: 'prc_free',
    })
  })

  it('normalizes missing items instead of crashing when hydration is unavailable', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.listOrganizationSubscriptions.mockResolvedValue({
      data: null,
      error: { code: 'network/offline', message: 'offline' },
    })

    const result = await listCompleteAppSubscriptions('app_invoice')

    expect(result.error?.code).toBe('network/offline')
    expect(result.data[0]?.items).toEqual([])
    expect(result.data[0]?.start_date).toBeNull()
  })
})
