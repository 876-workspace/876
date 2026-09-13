import request from 'supertest'

import { createApp } from '@/application'
import { resetSettingsForTest } from '@/config'
import { AppHttpError } from '@/http/errors'

const mocks = vi.hoisted(() => ({
  tenantByOrganizationId: vi.fn(),
  effectiveMember: vi.fn(),
  introspect: vi.fn(),
  organizationMembership: vi.fn(),
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  confirm: vi.fn(),
  cancel: vi.fn(),
  complete: vi.fn(),
  convertQuote: vi.fn(),
  convertToInvoice: vi.fn(),
}))

vi.mock('@/modules/tenants', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/tenants')>()),
  tenantAuthorizationByOrganizationId: mocks.tenantByOrganizationId,
}))
vi.mock('@/modules/access', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/access')>()),
  effectiveMemberAuthorization: mocks.effectiveMember,
}))
vi.mock('@/providers/identity', () => ({
  HttpIdentityGateway: class {
    introspect = mocks.introspect
    organizationMembership = mocks.organizationMembership
  },
}))
vi.mock('../sales-orders.service', () => ({
  salesOrdersService: {
    list: mocks.list,
    get: mocks.get,
    create: mocks.create,
    update: mocks.update,
    confirm: mocks.confirm,
    cancel: mocks.cancel,
    complete: mocks.complete,
    convertQuote: mocks.convertQuote,
    convertToInvoice: mocks.convertToInvoice,
  },
}))

const base = '/api/v1/sales-orders'
const order = {
  object: 'sales-order' as const,
  id: 'so_123',
  number: 'SO-000001',
  status: 'draft' as const,
}
const list = {
  object: 'list' as const,
  data: [order],
  has_more: false,
  total_count: null,
  url: base,
}
const createBody = {
  customerId: 'cus_123',
  lines: [{ description: 'Implementation', unitAmount: '12500' }],
}

function tenantCall(call: request.Test) {
  return call
    .set('authorization', 'Bearer access-token')
    .set('x-billing-organization-id', 'org_123')
}

describe('Sales Order tenant routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.BILLING_WRITER = 'express'
    resetSettingsForTest(process.env)
    mocks.tenantByOrganizationId.mockResolvedValue({
      id: 'tenant_123',
      active: true,
    })
    mocks.effectiveMember.mockResolvedValue({
      permissions: new Set(['sales-orders:read', 'sales-orders:write']),
    })
    mocks.introspect.mockResolvedValue({
      active: true,
      subject: 'user_123',
      appId: null,
      scopes: new Set(),
    })
    mocks.organizationMembership.mockResolvedValue({ role: 'super-admin' })
    mocks.list.mockResolvedValue(list)
    mocks.get.mockResolvedValue(order)
    mocks.create.mockResolvedValue({ resource: order, replayed: false })
    mocks.update.mockResolvedValue(order)
    mocks.confirm.mockResolvedValue(order)
    mocks.cancel.mockResolvedValue(order)
    mocks.complete.mockResolvedValue(order)
    mocks.convertQuote.mockResolvedValue({ resource: order, replayed: false })
    mocks.convertToInvoice.mockResolvedValue({
      resource: { object: 'invoice', id: 'inv_123' },
      replayed: false,
    })
  })

  it('rejects an unauthenticated Sales Order request', async () => {
    const response = await request(createApp())
      .get(base)
      .set('x-billing-organization-id', 'org_123')
    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('auth/missing-credential')
    expect(mocks.list).not.toHaveBeenCalled()
  })

  it('rejects listing without the Sales Order read permission', async () => {
    mocks.effectiveMember.mockResolvedValue({
      permissions: new Set(['sales-orders:write']),
    })
    const response = await tenantCall(request(createApp()).get(base))
    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('auth/forbidden')
    expect(mocks.list).not.toHaveBeenCalled()
  })

  it('returns a tenant-isolated missing order as not found', async () => {
    mocks.get.mockRejectedValue(
      new AppHttpError({
        code: 'billing/sales-order-not-found',
        message: 'The Sales Order was not found.',
        httpStatus: 404,
      })
    )
    const response = await tenantCall(
      request(createApp()).get(`${base}/so_other_tenant`)
    )
    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      data: null,
      error: {
        code: 'billing/sales-order-not-found',
        message: 'The Sales Order was not found.',
      },
    })
    expect(mocks.get).toHaveBeenCalledWith('tenant_123', 'so_other_tenant')
  })

  it('returns the registered invalid-state conflict for a non-draft patch', async () => {
    mocks.update.mockRejectedValue(
      new AppHttpError({
        code: 'billing/sales-order-invalid-state',
        message: 'This Sales Order cannot be changed in its current state.',
        httpStatus: 409,
      })
    )
    const response = await tenantCall(
      request(createApp()).patch(`${base}/so_123`).send({ notes: 'Changed' })
    )
    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('billing/sales-order-invalid-state')
    expect(mocks.update).toHaveBeenCalledWith('tenant_123', 'so_123', {
      notes: 'Changed',
    })
  })

  it('rejects a create without a customer before invoking the workflow', async () => {
    const response = await tenantCall(
      request(createApp()).post(base).send({ lines: createBody.lines })
    )
    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('validation/invalid-request')
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects a create with no lines before invoking the workflow', async () => {
    const response = await tenantCall(
      request(createApp()).post(base).send({ customerId: 'cus_123', lines: [] })
    )
    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('validation/invalid-request')
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects an unknown create field before invoking the workflow', async () => {
    const response = await tenantCall(
      request(createApp())
        .post(base)
        .send({ ...createBody, unknown: true })
    )
    expect(response.status).toBe(422)
    expect(response.body.error.code).toBe('validation/invalid-request')
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('lists Sales Orders with the requested status filter', async () => {
    const response = await tenantCall(
      request(createApp()).get(`${base}?status=confirmed`)
    )
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: list, error: null })
    expect(mocks.list).toHaveBeenCalledWith('tenant_123', {
      status: 'confirmed',
      limit: 100,
    })
  })

  it('lists Sales Orders with the requested customer filter', async () => {
    const response = await tenantCall(
      request(createApp()).get(`${base}?customerId=cus_123`)
    )
    expect(response.status).toBe(200)
    expect(response.body.data).toEqual(list)
    expect(mocks.list).toHaveBeenCalledWith('tenant_123', {
      customerId: 'cus_123',
      limit: 100,
    })
  })

  it('creates a Sales Order with normalized line amounts', async () => {
    const response = await tenantCall(
      request(createApp()).post(base).send(createBody)
    )
    expect(response.status).toBe(201)
    expect(response.body).toEqual({ data: order, error: null })
    expect(mocks.create).toHaveBeenCalledWith(
      'tenant_123',
      {
        customerId: 'cus_123',
        lines: [
          { description: 'Implementation', quantity: 1, unitAmount: 12500n },
        ],
      },
      undefined
    )
  })

  it('confirms a Sales Order through the assembled route', async () => {
    const response = await tenantCall(
      request(createApp()).post(`${base}/so_123/confirm`).send({})
    )
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: order, error: null })
    expect(mocks.confirm).toHaveBeenCalledWith(
      'tenant_123',
      'so_123',
      undefined
    )
  })

  it('converts a Sales Order to an invoice through the assembled route', async () => {
    const response = await tenantCall(
      request(createApp()).post(`${base}/so_123/convert-to-invoice`).send({})
    )
    expect(response.status).toBe(201)
    expect(response.body).toEqual({
      data: { object: 'invoice', id: 'inv_123' },
      error: null,
    })
    expect(mocks.convertToInvoice).toHaveBeenCalledWith(
      'tenant_123',
      'so_123',
      undefined
    )
  })
})
