import request from 'supertest'

import { createApp } from '@/application'
import { resetSettingsForTest } from '@/config'

const mocks = vi.hoisted(() => ({
  tenantByOrganizationId: vi.fn(),
  activeMember: vi.fn(),
  activeConnection: vi.fn(),
  appForApiKey: vi.fn(),
  introspect: vi.fn(),
  userBelongsToOrganization: vi.fn(),
  findIdempotentCustomerRow: vi.fn(),
  createCustomerRow: vi.fn(),
  enabledCurrencyExists: vi.fn(),
}))

vi.mock('@/modules/tenants', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/tenants')>()),
  tenantAuthorizationByOrganizationId: mocks.tenantByOrganizationId,
}))
vi.mock('@/modules/access', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/access')>()),
  activeMemberAuthorization: mocks.activeMember,
}))
vi.mock('@/modules/finance-connections', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/finance-connections')>()),
  activeConnectionAuthorization: mocks.activeConnection,
}))
vi.mock('@/modules/currencies/currencies.repository', () => ({
  enabledCurrencyExists: mocks.enabledCurrencyExists,
}))
vi.mock('@/modules/customers/customers.repository', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  findIdempotentCustomerRow: mocks.findIdempotentCustomerRow,
  createCustomerRow: mocks.createCustomerRow,
}))
vi.mock('@/providers/identity', () => ({
  HttpIdentityGateway: class {
    appForApiKey = mocks.appForApiKey
    introspect = mocks.introspect
    userBelongsToOrganization = mocks.userBelongsToOrganization
  },
}))

const customer = {
  id: 'cust_123',
  tenantId: 'btenant_123',
  sourceAppId: 'app_123',
  sourceExternalReference: 'crm_123',
  sourceIdempotencyKey: 'retry-1',
  sourcePayloadHash: 'hash',
  customerType: 'EXTERNAL' as const,
  customerKind: 'INDIVIDUAL' as const,
  organizationId: null,
  userId: null,
  externalReference: null,
  customerNumber: null,
  name: 'Ana',
  salutation: null,
  firstName: null,
  lastName: null,
  companyName: null,
  email: null,
  phone: null,
  workPhone: null,
  website: null,
  notes: null,
  taxRegistrationNumber: null,
  billingAddress: null,
  metadata: null,
  defaultCurrency: null,
  language: null,
  paymentTermId: null,
  salespersonId: null,
  priceListId: null,
  consolidatedBillingOverride: null,
  taxBehaviorOverride: null,
  lateFeeExempt: false,
  invoiceNotes: null,
  invoiceTerms: null,
  outstandingReceivable: 0n,
  unusedCredits: 0n,
  coreSyncedAt: null,
  status: 'ACTIVE' as const,
  createdAt: 1,
  updatedAt: 1,
  contacts: [],
}

describe('Customer integration routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.BILLING_WRITER = 'express'
    resetSettingsForTest(process.env)
    mocks.tenantByOrganizationId.mockResolvedValue({
      id: 'btenant_123',
      active: true,
    })
    mocks.activeConnection.mockResolvedValue({
      scopes: new Set(['billing.customers.write', 'billing.customers.read']),
    })
    mocks.appForApiKey.mockResolvedValue({ id: 'app_123' })
    mocks.enabledCurrencyExists.mockResolvedValue(true)
  })

  it('requires an idempotency key for a product-app create', async () => {
    const response = await request(createApp())
      .post('/api/v1/integrations/organizations/org_123/customers')
      .set('x-876-api-key', '876_app_secret_test')
      .send({ name: 'Ana', sourceExternalReference: 'crm_123' })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('billing/idempotency-key-required')
    expect(mocks.createCustomerRow).not.toHaveBeenCalled()
  })

  it('replays a matching app-scoped create with status 200', async () => {
    const raw = '{"name":"Ana","sourceExternalReference":"crm_123"}'
    const { integrationPayloadHash } = await import('@/platform/idempotency')
    mocks.findIdempotentCustomerRow.mockResolvedValue({
      ...customer,
      sourcePayloadHash: integrationPayloadHash(raw),
    })

    const response = await request(createApp())
      .post('/api/v1/integrations/organizations/org_123/customers')
      .set('content-type', 'application/json')
      .set('x-876-api-key', '876_app_secret_test')
      .set('idempotency-key', 'retry-1')
      .send(raw)

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({
      object: 'customer',
      id: 'cust_123',
      sourceAppId: 'app_123',
    })
    expect(mocks.createCustomerRow).not.toHaveBeenCalled()
  })

  it('rejects a reused key when the canonical payload changes', async () => {
    mocks.findIdempotentCustomerRow.mockResolvedValue(customer)
    const response = await request(createApp())
      .post('/api/v1/integrations/organizations/org_123/customers')
      .set('x-876-api-key', '876_app_secret_test')
      .set('idempotency-key', 'retry-1')
      .send({ name: 'Different', sourceExternalReference: 'crm_123' })

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('billing/idempotency-conflict')
  })
})
