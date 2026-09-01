import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  listProviders: vi.fn(),
  listImports: vi.fn(),
  runSync: vi.fn(),
}))

vi.mock('../accounting-providers.service', () => ({
  authorizeAccountingConnection: vi.fn(),
  completeZohoOauth: vi.fn(),
  createAccountingConnection: vi.fn(),
  deleteAccountingConnection: vi.fn(),
  listAccountingConnections: vi.fn(),
  listAccountingProviders: mocks.listProviders,
  retrieveAccountingConnection: vi.fn(),
  updateAccountingConnection: vi.fn(),
  validateAccountingConnection: vi.fn(),
  zohoAccessContext: vi.fn(),
}))

vi.mock('../accounting-import.service', () => ({
  adoptAccountingProviderResource: vi.fn(),
  listAccountingImportCandidates: mocks.listImports,
  releaseAccountingProviderResource: vi.fn(),
}))

vi.mock('../accounting-sync.service', () => ({
  reconcileAccountingConnection: vi.fn(),
  runAccountingSync: mocks.runSync,
}))

import { createApp } from '@/application'
import { resetSettingsForTest } from '@/config'

const INTERNAL_KEY = 'internal-secret'
const SCHEDULER_KEY = 'scheduler-secret'

const provider = {
  object: 'accounting-provider',
  id: 'aprov_zoho_books',
  key: 'zoho-books',
  name: 'Zoho Books',
  adapter: 'zoho-books',
  capabilities: {
    customers: true,
    items: true,
    estimates: true,
    invoices: true,
    recurringInvoices: true,
    paymentsReceived: true,
    imports: true,
    webhooks: false,
  },
  isActive: true,
} as const

describe('accounting provider HTTP routes', () => {
  beforeAll(() => {
    process.env.BILLING_WRITER = 'express'
    process.env.BILLING_INTERNAL_KEY = INTERNAL_KEY
    process.env.BILLING_SCHEDULER_KEY = SCHEDULER_KEY
    resetSettingsForTest(process.env)
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.listProviders.mockResolvedValue({
      object: 'list',
      data: [provider],
      has_more: false,
      total_count: 1,
      url: '/api/v1/admin/accounting-providers',
    })
  })

  it('returns the provider catalog through the assembled admin route and envelope', async () => {
    const response = await request(createApp())
      .get('/api/v1/admin/accounting-providers')
      .set('x-internal-key', INTERNAL_KEY)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [provider],
        has_more: false,
        total_count: 1,
        url: '/api/v1/admin/accounting-providers',
      },
      error: null,
    })
    expect(mocks.listProviders).toHaveBeenCalledTimes(1)
  })

  it('keeps the Zoho OAuth callback public while validating its query contract', async () => {
    const response = await request(createApp()).get(
      '/api/v1/providers/zoho-books/oauth/callback'
    )

    expect(response.status).toBe(422)
    expect(response.body.data).toBeNull()
    expect(response.body.error?.code).toBe('validation/invalid-request')
  })

  it('validates import resource types after admin authorization', async () => {
    const response = await request(createApp())
      .get(
        '/api/v1/admin/organizations/org_1/accounting-provider-connections/acctconn_1/imports/invoice'
      )
      .set('x-internal-key', INTERNAL_KEY)

    expect(response.status).toBe(422)
    expect(response.body.error?.code).toBe('validation/invalid-request')
    expect(mocks.listImports).not.toHaveBeenCalled()
  })

  it('requires the scheduler credential for the accounting sync sweep', async () => {
    const response = await request(createApp())
      .post('/internal/accounting-sync')
      .send({ limit: 10 })

    expect(response.status).toBe(401)
    expect(response.body.error?.code).toBe('auth/missing-credential')
    expect(mocks.runSync).not.toHaveBeenCalled()
  })

  it('validates scheduler input before invoking the sync worker', async () => {
    const response = await request(createApp())
      .post('/internal/accounting-sync')
      .set('x-scheduler-key', SCHEDULER_KEY)
      .send({ limit: 0 })

    expect(response.status).toBe(422)
    expect(response.body.error?.code).toBe('validation/invalid-request')
    expect(mocks.runSync).not.toHaveBeenCalled()
  })
})
