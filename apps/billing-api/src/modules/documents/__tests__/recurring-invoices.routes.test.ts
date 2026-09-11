import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createApp } from '@/application'
import { resetSettingsForTest } from '@/config'
import { AppHttpError } from '@/http/errors'

const mocks = vi.hoisted(() => ({
  tenantByOrganizationId: vi.fn(),
  effectiveMember: vi.fn(),
  activeConnection: vi.fn(),
  appForApiKey: vi.fn(),
  introspect: vi.fn(),
  organizationMembership: vi.fn(),
  list: vi.fn(),
  retrieve: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  transition: vi.fn(),
  remove: vi.fn(),
  children: vi.fn(),
}))

vi.mock('@/modules/tenants', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/tenants')>()),
  tenantAuthorizationByOrganizationId: mocks.tenantByOrganizationId,
}))
vi.mock('@/modules/access', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/access')>()),
  effectiveMemberAuthorization: mocks.effectiveMember,
}))
vi.mock('@/modules/finance-connections', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/finance-connections')>()),
  activeConnectionAuthorization: mocks.activeConnection,
}))
vi.mock('@/providers/identity', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/providers/identity')>()),
  HttpIdentityGateway: class {
    appForApiKey = mocks.appForApiKey
    introspect = mocks.introspect
    organizationMembership = mocks.organizationMembership
  },
}))
vi.mock('../recurring-invoices.service', () => ({
  recurringInvoicesService: {
    list: mocks.list,
    retrieve: mocks.retrieve,
    create: mocks.create,
    update: mocks.update,
    transition: mocks.transition,
    delete: mocks.remove,
    children: mocks.children,
  },
}))

const ORGANIZATION = 'org_kingston'
const TENANT = 'ten_kingston_01'
const PROFILE = 'rinv_7Hk2Qm4Z'

const profile = {
  object: 'recurring-invoice',
  id: PROFILE,
  profileName: 'Harbour View monthly retainer',
  customerId: 'cus_9fK2mQ8x',
  currency: 'JMD',
  status: 'active',
}

const createBody = {
  profileName: 'Harbour View monthly retainer',
  customerId: 'cus_9fK2mQ8x',
  currency: 'JMD',
  frequency: { intervalUnit: 'month', intervalCount: 1 },
  startAt: 1_787_050_000,
  generationMode: 'finalize',
  lines: [
    {
      description: 'Monthly retainer — Harbour View',
      quantity: 1,
      unitAmount: '4500000',
    },
  ],
}

function tenantCall(call: request.Test) {
  return call
    .set('authorization', 'Bearer access-token')
    .set('x-billing-organization-id', ORGANIZATION)
}

function integrationCall(call: request.Test) {
  return call.set('x-876-api-key', '876_app_secret_invoice')
}

describe('Recurring Invoice routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.BILLING_WRITER = 'express'
    resetSettingsForTest(process.env)
    mocks.tenantByOrganizationId.mockImplementation(
      async (organizationId: string) =>
        organizationId === ORGANIZATION ? { id: TENANT, active: true } : null
    )
    mocks.effectiveMember.mockResolvedValue({
      permissions: new Set(['sales:read', 'sales:write']),
    })
    mocks.activeConnection.mockResolvedValue({
      scopes: new Set(['billing.invoices.read', 'billing.invoices.write']),
    })
    mocks.appForApiKey.mockResolvedValue({ id: 'app_invoice' })
    mocks.introspect.mockResolvedValue({
      active: true,
      subject: 'user_2kL9mN4q',
      appId: null,
      scopes: new Set(),
    })
    mocks.organizationMembership.mockResolvedValue({ role: 'super-admin' })
    mocks.retrieve.mockResolvedValue(profile)
    mocks.create.mockResolvedValue(profile)
    mocks.transition.mockResolvedValue(profile)
  })

  it('retrieves an owning-tenant profile through the tenant route', async () => {
    // ACT
    const response = await tenantCall(
      request(createApp()).get(`/api/v1/recurring-invoices/${PROFILE}`)
    )

    // ASSERT
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: profile, error: null })
    expect(mocks.retrieve).toHaveBeenCalledTimes(1)
    expect(mocks.retrieve).toHaveBeenCalledWith(TENANT, PROFILE)
  })

  it('returns 404 when the requested profile belongs to another tenant', async () => {
    // ARRANGE
    mocks.retrieve.mockRejectedValue(
      new AppHttpError({
        code: 'billing/recurring-invoice-not-found',
        message: 'Recurring Invoice not found.',
        httpStatus: 404,
      })
    )

    // ACT
    const response = await tenantCall(
      request(createApp()).get('/api/v1/recurring-invoices/rinv_other_tenant')
    )

    // ASSERT
    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      data: null,
      error: {
        code: 'billing/recurring-invoice-not-found',
        message: 'Recurring Invoice not found.',
      },
    })
    expect(mocks.retrieve).toHaveBeenCalledTimes(1)
    expect(mocks.retrieve).toHaveBeenCalledWith(TENANT, 'rinv_other_tenant')
  })

  it('returns a 409 error envelope without an httpStatus field on an invalid pause', async () => {
    // ARRANGE
    mocks.transition.mockRejectedValue(
      new AppHttpError({
        code: 'billing/recurring-invoice-invalid-state',
        message: 'Only an active Recurring Invoice can be paused.',
        httpStatus: 409,
      })
    )

    // ACT
    const response = await tenantCall(
      request(createApp()).post(`/api/v1/recurring-invoices/${PROFILE}/pause`)
    ).send({})

    // ASSERT
    expect(response.status).toBe(409)
    expect(response.body).toEqual({
      data: null,
      error: {
        code: 'billing/recurring-invoice-invalid-state',
        message: 'Only an active Recurring Invoice can be paused.',
      },
    })
    expect(response.body.error).not.toHaveProperty('httpStatus')
    expect(mocks.transition).toHaveBeenCalledTimes(1)
    expect(mocks.transition).toHaveBeenCalledWith(TENANT, PROFILE, 'pause')
  })

  it('refuses a tenant mutation without the sales write permission', async () => {
    // ARRANGE
    mocks.effectiveMember.mockResolvedValue({
      permissions: new Set(['sales:read']),
    })

    // ACT
    const response = await tenantCall(
      request(createApp()).post(`/api/v1/recurring-invoices/${PROFILE}/pause`)
    ).send({})

    // ASSERT
    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('auth/forbidden')
    expect(mocks.transition).not.toHaveBeenCalled()
  })

  it('requires the invoices write scope for integration mutations', async () => {
    // ARRANGE
    mocks.activeConnection.mockResolvedValue({
      scopes: new Set(['billing.invoices.read']),
    })

    // ACT
    const response = await integrationCall(
      request(createApp()).post(
        `/api/v1/integrations/organizations/${ORGANIZATION}/recurring-invoices`
      )
    ).send(createBody)

    // ASSERT
    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('billing/connection-forbidden')
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('creates a profile through the integration route with the write scope', async () => {
    // ACT
    const response = await integrationCall(
      request(createApp()).post(
        `/api/v1/integrations/organizations/${ORGANIZATION}/recurring-invoices`
      )
    ).send(createBody)

    // ASSERT
    expect(response.status).toBe(201)
    expect(response.body).toEqual({ data: profile, error: null })
    expect(mocks.create).toHaveBeenCalledTimes(1)
    expect(mocks.create).toHaveBeenCalledWith(
      TENANT,
      expect.objectContaining({
        customerId: 'cus_9fK2mQ8x',
        currency: 'JMD',
      })
    )
  })

  it('returns 404 for an organization without a billing workspace', async () => {
    // ACT
    const response = await tenantCall(
      request(createApp()).get(`/api/v1/recurring-invoices/${PROFILE}`)
    ).set('x-billing-organization-id', 'org_unknown')

    // ASSERT
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('billing/tenant-not-found')
    expect(mocks.retrieve).not.toHaveBeenCalled()
  })
})
