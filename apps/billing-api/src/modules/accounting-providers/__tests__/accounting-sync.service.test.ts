import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  claimJobs: vi.fn(),
  findReference: vi.fn(),
  markDelivered: vi.fn(),
  markFailed: vi.fn(),
  markConnectionSuccess: vi.fn(),
  markConnectionFailure: vi.fn(),
  removeReference: vi.fn(),
  upsertReference: vi.fn(),
  enqueueResources: vi.fn(),
  accountingProvider: vi.fn(),
  zohoAccessContext: vi.fn(),
  findConnection: vi.fn(),
  invoiceFindFirst: vi.fn(),
}))

vi.mock('@/config', () => ({
  getSettings: () => ({
    features: { accountingProviderSync: true },
    accountingProviderSyncBatchSize: 10,
  }),
}))

vi.mock('@/platform/timestamps', () => ({ nowUnixSeconds: () => 1_800_000_000 }))

vi.mock('@/db/client', () => ({
  prisma: {
    customer: { findFirst: vi.fn() },
    item: { findFirst: vi.fn() },
    estimate: { findFirst: vi.fn() },
    invoice: { findFirst: mocks.invoiceFindFirst },
    subscription: { findFirst: vi.fn() },
    payment: { findFirst: vi.fn() },
  },
}))

vi.mock('@/providers/accounting', () => ({
  accountingProvider: mocks.accountingProvider,
  accountingResourceTypes: [
    'customer',
    'item',
    'estimate',
    'invoice',
    'recurring-invoice',
    'payment',
  ],
}))

vi.mock('../accounting-providers.service', () => ({
  zohoAccessContext: mocks.zohoAccessContext,
}))

vi.mock('../accounting-providers.repository', () => ({
  findAccountingConnectionRow: mocks.findConnection,
}))

vi.mock('../accounting-sync.repository', () => ({
  claimAccountingSyncJobs: mocks.claimJobs,
  enqueueConnectionResources: mocks.enqueueResources,
  findAccountingReference: mocks.findReference,
  markAccountingConnectionSyncFailure: mocks.markConnectionFailure,
  markAccountingConnectionSyncSuccess: mocks.markConnectionSuccess,
  markAccountingSyncDelivered: mocks.markDelivered,
  markAccountingSyncFailed: mocks.markFailed,
  removeAccountingReference: mocks.removeReference,
  upsertAccountingReference: mocks.upsertReference,
}))

import { runAccountingSync } from '../accounting-sync.service'

const invoiceJob = {
  id: 'apsync_1',
  tenantId: 'ten_1',
  connectionId: 'acon_1',
  resourceType: 'invoice',
  resourceId: 'inv_1',
  operation: 'sync',
  status: 'processing',
  generation: 4,
  attemptCount: 2,
  availableAt: 1_800_000_000,
  lockedAt: 1_800_000_000,
  deliveredAt: null,
  lastErrorCode: null,
  lastError: null,
  createdAt: 1_800_000_000,
  updatedAt: 1_800_000_000,
  connection: {
    id: 'acon_1',
    tenantId: 'ten_1',
    providerId: 'aprov_1',
    name: 'Zoho Books',
    environment: 'live',
    status: 'active',
    mode: 'mirror',
    providerOrganizationId: 'zoho_org_1',
    accountsDomain: 'https://accounts.zoho.com',
    apiDomain: 'https://www.zohoapis.com',
    scopes: [],
    sealedRefreshToken: 'sealed',
    refreshTokenKeyId: null,
    refreshTokenVaultProvider: null,
    oauthStateHash: null,
    oauthStateExpiresAt: null,
    settings: null,
    lastSyncedAt: null,
    lastSuccessfulSyncAt: null,
    lastErrorCode: null,
    createdAt: 1_800_000_000,
    updatedAt: 1_800_000_000,
    provider: {
      id: 'aprov_1',
      key: 'zoho-books',
      name: 'Zoho Books',
      adapter: 'zoho-books',
      capabilities: {},
      isActive: true,
      createdAt: 1_800_000_000,
      updatedAt: 1_800_000_000,
    },
  },
}

describe('accounting sync dependency handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.claimJobs.mockResolvedValue([invoiceJob])
    mocks.invoiceFindFirst.mockResolvedValue({
      id: 'inv_1',
      tenantId: 'ten_1',
      customerId: 'cust_1',
      number: 'INV-1',
      currency: 'JMD',
      issueAt: 1_800_000_000,
      dueAt: 1_800_086_400,
      referenceNumber: null,
      notes: null,
      terms: null,
      lines: [],
    })
    mocks.findReference.mockResolvedValue(null)
    mocks.markFailed.mockResolvedValue({ count: 1 })
    mocks.markConnectionFailure.mockResolvedValue({ count: 1 })
  })

  it('keeps an invoice retryable until its provider customer mapping exists', async () => {
    const result = await runAccountingSync(10)

    expect(result).toEqual({
      object: 'accounting-sync-run',
      claimed: 1,
      succeeded: 0,
      failed: 1,
      blocked: 0,
      skipped: 0,
      disabled: false,
    })
    expect(mocks.markFailed).toHaveBeenCalledWith({
      id: 'apsync_1',
      generation: 4,
      attemptCount: 2,
      code: 'billing/accounting-dependency-pending',
      message: 'Accounting dependency customer:cust_1 has not synced yet.',
      retryable: true,
      now: 1_800_000_000,
    })
    expect(mocks.markConnectionFailure).toHaveBeenCalledWith(
      'acon_1',
      'billing/accounting-dependency-pending',
      false,
      1_800_000_000
    )
    expect(mocks.accountingProvider).not.toHaveBeenCalled()
    expect(mocks.upsertReference).not.toHaveBeenCalled()
    expect(mocks.markDelivered).not.toHaveBeenCalled()
  })
})
