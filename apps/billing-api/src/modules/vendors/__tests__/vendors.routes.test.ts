import request from 'supertest'

import { createApp } from '@/application'

const mocks = vi.hoisted(() => ({
  tenantByOrganizationId: vi.fn(),
  effectiveMember: vi.fn(),
  introspect: vi.fn(),
  organizationMembership: vi.fn(),
  listVendorRows: vi.fn(),
  createVendorRow: vi.fn(),
  enabledCurrencyExists: vi.fn(),
}))

vi.mock('@/modules/tenants', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/tenants')>()),
  tenantAuthorizationByOrganizationId: mocks.tenantByOrganizationId,
}))
vi.mock('@/modules/access', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/access')>()),
  effectiveMemberAuthorization: mocks.effectiveMember,
}))
vi.mock('@/modules/vendors/vendors.repository', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  listVendorRows: mocks.listVendorRows,
  createVendorRow: mocks.createVendorRow,
}))
vi.mock('@/modules/currencies/currencies.repository', () => ({
  enabledCurrencyExists: mocks.enabledCurrencyExists,
}))
vi.mock('@/providers/identity', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/providers/identity')>()),
  HttpIdentityGateway: class {
    introspect = mocks.introspect
    organizationMembership = mocks.organizationMembership
  },
}))

const vendor = {
  id: 'vendor_123',
  tenantId: 'btenant_123',
  externalReference: 'supplier_123',
  name: 'Harbour Supplies',
  email: 'orders@harbour.test',
  phone: null,
  billingAddress: null,
  metadata: null,
  defaultCurrency: 'JMD',
  status: 'ACTIVE' as const,
  createdAt: 1_787_000_000,
  updatedAt: 1_787_000_000,
}

function authorized(requestBuilder: request.Test): request.Test {
  return requestBuilder
    .set('authorization', 'Bearer access-token')
    .set('x-billing-organization-id', 'org_123')
}

describe('Vendors routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.BILLING_WRITER = 'express'
    mocks.tenantByOrganizationId.mockResolvedValue({
      id: 'btenant_123',
      active: true,
    })
    mocks.effectiveMember.mockResolvedValue({
      permissions: new Set(['vendors:read', 'vendors:write']),
    })
    mocks.introspect.mockResolvedValue({
      active: true,
      subject: 'user_123',
      appId: null,
      scopes: new Set(),
    })
    mocks.organizationMembership.mockResolvedValue({ role: 'super-admin' })
    mocks.enabledCurrencyExists.mockResolvedValue(true)
  })

  it('lists tenant vendors through the real auth, validation, and envelope chain', async () => {
    // ARRANGE
    mocks.listVendorRows.mockResolvedValue([vendor])
    const app = createApp()

    // ACT
    const response = await authorized(request(app).get('/api/v1/vendors'))

    // ASSERT
    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [
          {
            object: 'vendor',
            id: 'vendor_123',
            externalReference: 'supplier_123',
            name: 'Harbour Supplies',
            email: 'orders@harbour.test',
            phone: null,
            billingAddress: null,
            metadata: null,
            defaultCurrency: 'JMD',
            status: 'ACTIVE',
            createdAt: 1_787_000_000,
            updatedAt: 1_787_000_000,
          },
        ],
        has_more: false,
        total_count: 1,
        url: '/api/v1/vendors',
      },
      error: null,
    })
    expect(mocks.listVendorRows).toHaveBeenCalledWith('btenant_123', undefined)
    expect(mocks.organizationMembership).toHaveBeenCalledWith(
      'access-token',
      'org_123'
    )
    expect(mocks.effectiveMember).toHaveBeenCalledWith(
      'btenant_123',
      'user_123',
      'super-admin'
    )
  })

  it('creates a vendor with server-owned tenant and identifier fields', async () => {
    // ARRANGE
    mocks.createVendorRow.mockImplementation(async (data) => ({
      ...vendor,
      ...data,
      id: 'vendor_generated',
    }))
    const app = createApp()

    // ACT
    const response = await authorized(
      request(app).post('/api/v1/vendors').send({
        name: 'Harbour Supplies',
        currency: 'jmd',
        externalReference: 'supplier_123',
      })
    )

    // ASSERT
    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({
      object: 'vendor',
      id: 'vendor_generated',
      name: 'Harbour Supplies',
      defaultCurrency: 'JMD',
    })
    expect(mocks.createVendorRow).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'btenant_123',
        defaultCurrency: 'JMD',
      })
    )
  })

  it('rejects unknown request fields with the stable validation error', async () => {
    // ARRANGE
    const app = createApp()

    // ACT
    const response = await authorized(
      request(app).post('/api/v1/vendors').send({
        name: 'Harbour Supplies',
        tenantId: 'attacker-controlled',
      })
    )

    // ASSERT
    expect(response.status).toBe(422)
    expect(response.body.data).toBeNull()
    expect(response.body.error.code).toBe('validation/invalid-request')
    expect(mocks.createVendorRow).not.toHaveBeenCalled()
  })

  it('rejects a missing credential before resolving tenant data', async () => {
    // ARRANGE
    const app = createApp()

    // ACT
    const response = await request(app)
      .get('/api/v1/vendors')
      .set('x-billing-organization-id', 'org_123')

    // ASSERT
    expect(response.status).toBe(401)
    expect(response.body).toEqual({
      data: null,
      error: {
        code: 'auth/missing-credential',
        message: 'An authentication credential is required.',
      },
    })
    expect(mocks.tenantByOrganizationId).not.toHaveBeenCalled()
  })
})
