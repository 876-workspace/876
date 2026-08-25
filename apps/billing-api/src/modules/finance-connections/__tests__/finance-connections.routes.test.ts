import {
  financeProvisioningReceiptEnvelopeSchema,
  type FinanceProvisioningEvent,
} from '@876/server/finance-provisioning'
import request from 'supertest'

import { createApp } from '@/application'
import { resetSettingsForTest } from '@/config'

const mocks = vi.hoisted(() => ({
  ensureFinanceConnection: vi.fn(),
}))

vi.mock('../finance-connections.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../finance-connections.service')>()),
  ensureFinanceConnection: mocks.ensureFinanceConnection,
}))

function event(
  overrides: Partial<FinanceProvisioningEvent> = {}
): FinanceProvisioningEvent {
  return {
    eventId: 'finance_evt_123',
    eventType: 'finance_connection.ensure',
    contractVersion: 1,
    aggregateId: 'org_123:876-invoice',
    organization: {
      id: 'org_123',
      name: 'Test Org',
      slug: 'test-org',
      countryCode: 'JM',
      currencyCode: 'JMD',
    },
    sourceAppId: '876-invoice',
    entitlementReference: 'sub_123',
    manifestVersion: 1,
    provisioningRevision: 4,
    lifecycleVersion: 7,
    desiredStatus: 'ACTIVE',
    scopes: ['billing.customers.read', 'billing.customers.write'],
    occurredAt: 1_787_000_000,
    ...overrides,
  }
}

const receipt = {
  id: 'finance_connection_123',
  tenantId: 'btenant_123',
  status: 'ACTIVE' as const,
  lifecycleVersion: 7,
  applied: true,
  duplicate: false,
}

describe('Billing finance provisioning HTTP contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.BILLING_INTERNAL_KEY = 'shared-secret'
    process.env.API_INTERNAL_KEY = ''
    process.env.BILLING_WRITER = 'express'
    resetSettingsForTest(process.env)
    mocks.ensureFinanceConnection.mockResolvedValue(receipt)
  })

  it('accepts the shared event and returns the shared receipt envelope', async () => {
    const response = await request(createApp())
      .post('/api/v1/admin/finance-connections/ensure')
      .set('x-internal-key', 'shared-secret')
      .send(event())

    expect(response.status).toBe(200)
    expect(
      financeProvisioningReceiptEnvelopeSchema.parse(response.body)
    ).toEqual({
      data: receipt,
      error: null,
    })
    expect(mocks.ensureFinanceConnection).toHaveBeenCalledWith(event())
  })

  it('rejects missing internal credentials before provisioning', async () => {
    const response = await request(createApp())
      .post('/api/v1/admin/finance-connections/ensure')
      .send(event())

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('auth/missing-credential')
    expect(mocks.ensureFinanceConnection).not.toHaveBeenCalled()
  })

  it('rejects a wrong internal key before provisioning', async () => {
    const response = await request(createApp())
      .post('/api/v1/admin/finance-connections/ensure')
      .set('x-internal-key', 'wrong-secret')
      .send(event())

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('auth/invalid-internal-key')
    expect(mocks.ensureFinanceConnection).not.toHaveBeenCalled()
  })

  it('rejects an undotted finance scope with the stable validation error', async () => {
    const response = await request(createApp())
      .post('/api/v1/admin/finance-connections/ensure')
      .set('x-internal-key', 'shared-secret')
      .send({ ...event(), scopes: ['read'] })

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('validation/invalid-request')
    expect(mocks.ensureFinanceConnection).not.toHaveBeenCalled()
  })

  it('rejects duplicate finance scopes', async () => {
    const response = await request(createApp())
      .post('/api/v1/admin/finance-connections/ensure')
      .set('x-internal-key', 'shared-secret')
      .send({
        ...event(),
        scopes: ['billing.customers.read', 'billing.customers.read'],
      })

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('validation/invalid-request')
  })

  it('rejects unknown event fields so API and Billing cannot silently drift', async () => {
    const response = await request(createApp())
      .post('/api/v1/admin/finance-connections/ensure')
      .set('x-internal-key', 'shared-secret')
      .send({ ...event(), futureField: true })

    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('validation/invalid-request')
    expect(mocks.ensureFinanceConnection).not.toHaveBeenCalled()
  })

  it.each(['PENDING', 'DELETED', 'active'])(
    'rejects unsupported desired status %s',
    async (desiredStatus) => {
      const response = await request(createApp())
        .post('/api/v1/admin/finance-connections/ensure')
        .set('x-internal-key', 'shared-secret')
        .send({ ...event(), desiredStatus })

      expect(response.status).toBe(422)
      expect(response.body.error.code).toBe('validation/invalid-request')
    }
  )

  it('accepts an idempotent duplicate receipt as a valid success contract', async () => {
    mocks.ensureFinanceConnection.mockResolvedValue({
      ...receipt,
      applied: false,
      duplicate: true,
    })

    const response = await request(createApp())
      .post('/api/v1/admin/finance-connections/ensure')
      .set('x-internal-key', 'shared-secret')
      .send(event())

    expect(response.status).toBe(200)
    expect(
      financeProvisioningReceiptEnvelopeSchema.parse(response.body).data
    ).toMatchObject({
      lifecycleVersion: 7,
      applied: false,
      duplicate: true,
    })
  })
})
