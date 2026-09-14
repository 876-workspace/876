import { beforeEach, describe, expect, it, vi } from 'vitest'

import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getManageContext: vi.fn(),
  listRegistry: vi.fn(),
  getCouriers: vi.fn(),
  listProfiles: vi.fn(),
}))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))
vi.mock('@/lib/services/billing', () => ({
  billingIntegration: { customers: { list: mocks.listRegistry } },
}))
vi.mock('@/lib/services/couriers', () => ({ getCouriers: mocks.getCouriers }))

import { GET } from './route'

const context = {
  userId: 'usr_ops',
  orgId: 'org_nkr',
  role: 'admin' as const,
  tenant: { id: 'ten_nkr' },
}
const registryCustomer = {
  id: 'cus_ada',
  name: 'Ada Lovelace',
  email: 'ada@example.test',
  phone: '+18765550142',
  firstName: 'Ada',
  lastName: 'Lovelace',
  companyName: null,
  customerKind: 'INDIVIDUAL' as const,
}

function request(query = 'orgSlug=nkr&q=ada') {
  return new NextRequest(
    `http://couriers.test/api/manage/customers/registry?${query}`
  )
}

describe('GET /api/manage/customers/registry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getManageContext.mockResolvedValue(context)
    mocks.listRegistry.mockResolvedValue({
      data: { data: [registryCustomer] },
      error: null,
    })
    mocks.getCouriers.mockResolvedValue({
      customers: { list: mocks.listProfiles },
    })
    mocks.listProfiles.mockResolvedValue({ data: { data: [] }, error: null })
  })

  it('returns 422 before looking up a context when the organization is missing', async () => {
    const response = await GET(request('q=ada'))

    expect(response.status).toBe(422)
    expect(mocks.getManageContext).not.toHaveBeenCalled()
    expect(mocks.listRegistry).not.toHaveBeenCalled()
  })

  it('authorizes before querying the registry', async () => {
    mocks.getManageContext.mockResolvedValue(null)

    const response = await GET(request())

    expect(response.status).toBe(401)
    expect(mocks.listRegistry).not.toHaveBeenCalled()
  })

  it('rejects non-admin members before querying the registry', async () => {
    mocks.getManageContext.mockResolvedValue({ ...context, role: 'staff' })

    const response = await GET(request())

    expect(response.status).toBe(403)
    expect(mocks.listRegistry).not.toHaveBeenCalled()
  })

  it('requires a tenant before querying the registry', async () => {
    mocks.getManageContext.mockResolvedValue({ ...context, tenant: null })

    const response = await GET(request())

    expect(response.status).toBe(404)
    expect(mocks.listRegistry).not.toHaveBeenCalled()
  })

  it('does not issue a registry lookup for an empty query', async () => {
    const response = await GET(request('orgSlug=nkr&q=%20'))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ data: [], error: null })
    expect(mocks.listRegistry).not.toHaveBeenCalled()
  })

  it('passes the query and bounded page size to the registry', async () => {
    await GET(request())

    expect(mocks.listRegistry).toHaveBeenCalledWith('org_nkr', {
      q: 'ada',
      status: 'ACTIVE',
      limit: 20,
    })
  })

  it('marks only matching registry parties with profiles as already enrolled', async () => {
    mocks.listProfiles.mockResolvedValue({
      data: { data: [{ billing_customer_id: 'cus_ada' }] },
      error: null,
    })

    const response = await GET(request())

    expect(await response.json()).toEqual({
      data: [expect.objectContaining({ id: 'cus_ada', enrolled: true })],
      error: null,
    })
    expect(mocks.listProfiles).toHaveBeenCalledWith({
      limit: 20,
      billing_customer_ids: 'cus_ada',
    })
  })

  it('normalizes an unavailable registry to the registered customer error', async () => {
    mocks.listRegistry.mockResolvedValue({
      data: null,
      error: { code: 'provider/offline', message: 'Offline.' },
    })

    const response = await GET(request())

    expect(response.status).toBe(502)
    expect((await response.json()).error).toEqual({
      code: 'customer/registry-unavailable',
      message: 'The customer registry is unavailable. Please try again.',
    })
  })
})
