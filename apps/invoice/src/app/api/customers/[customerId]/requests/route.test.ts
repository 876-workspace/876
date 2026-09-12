import { getError, toAppError } from '@876/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  permission: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiPermission: mocks.permission,
}))
vi.mock('@/lib/services/crm', () => ({
  getCrm: () => ({
    requests: {
      listForBillingCustomer: mocks.list,
      createForBillingCustomer: mocks.create,
    },
  }),
}))

import { GET, POST } from './route'

const route = { params: Promise.resolve({ customerId: 'cus_1' }) } as never
const access = { response: null, orgId: 'org_1', userId: 'usr_1' }
const requestList = {
  object: 'list', data: [], has_more: false, total_count: 0, url: '/requests',
}
const request = { object: 'request', id: 'req_1', number: 42 }

function post(body: BodyInit | null) {
  return new Request('http://invoice.test/api/customers/cus_1/requests', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body,
  })
}

describe('Invoice customer requests route', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.permission.mockResolvedValue(access)
  })

  it('returns 422 for an invalid query without calling CRM', async () => {
    const response = await GET(new Request('http://invoice.test/?status=nope'), route)

    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({ data: null, error: toAppError(getError('crm/invalid-request')) })
    expect(mocks.list).not.toHaveBeenCalled()
  })

  it('returns 422 for invalid JSON without calling CRM', async () => {
    const response = await POST(post('{'), route)

    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({ data: null, error: toAppError(getError('crm/invalid-request')) })
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('returns the permission response unchanged when access is forbidden', async () => {
    mocks.permission.mockResolvedValue({ response: Response.json({ data: null, error: { code: 'auth/forbidden', message: 'Forbidden.' } }, { status: 403 }) })

    const response = await GET(new Request('http://invoice.test/'), route)

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ data: null, error: { code: 'auth/forbidden', message: 'Forbidden.' } })
    expect(mocks.list).not.toHaveBeenCalled()
  })

  it('maps CRM configuration failures to 503', async () => {
    const result = { data: null, error: { code: 'crm/not-configured', message: 'CRM is not configured.' } }
    mocks.list.mockResolvedValue(result)

    const response = await GET(new Request('http://invoice.test/'), route)

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual(result)
    expect(mocks.list).toHaveBeenCalledTimes(1)
    expect(mocks.list).toHaveBeenCalledWith('org_1', 'cus_1', {})
  })

  it('maps other CRM failures to 502', async () => {
    const result = { data: null, error: { code: 'crm/unavailable', message: 'CRM is unavailable.' } }
    mocks.create.mockResolvedValue(result)

    const response = await POST(post(JSON.stringify({ subject: 'Need help' })), route)

    expect(response.status).toBe(502)
    expect(await response.json()).toEqual(result)
    expect(mocks.create).toHaveBeenCalledWith('org_1', 'cus_1', { subject: 'Need help', createdBy: 'usr_1' })
  })

  it('returns the full successful list envelope with 200', async () => {
    const result = { data: requestList, error: null }
    mocks.list.mockResolvedValue(result)

    const response = await GET(new Request('http://invoice.test/?status=OPEN&relatedResourceType=invoice&relatedResourceId=inv_1'), route)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(result)
    expect(mocks.list).toHaveBeenCalledTimes(1)
    expect(mocks.list).toHaveBeenCalledWith('org_1', 'cus_1', { status: 'OPEN', relatedResourceType: 'invoice', relatedResourceId: 'inv_1' })
  })

  it('returns the full successful create envelope with 201', async () => {
    const result = { data: request, error: null }
    mocks.create.mockResolvedValue(result)

    const response = await POST(post(JSON.stringify({ subject: 'Need help', description: null, relatedResourceType: 'invoice', relatedResourceId: 'inv_1', relatedResourceSnapshot: { number: 'INV-1', amount: '1099', currency: 'USD', status: 'OPEN' } })), route)

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual(result)
    expect(mocks.create).toHaveBeenCalledTimes(1)
    expect(mocks.create).toHaveBeenCalledWith('org_1', 'cus_1', { subject: 'Need help', description: null, relatedResourceType: 'invoice', relatedResourceId: 'inv_1', relatedResourceSnapshot: { number: 'INV-1', amount: '1099', currency: 'USD', status: 'OPEN' }, createdBy: 'usr_1' })
  })
})
