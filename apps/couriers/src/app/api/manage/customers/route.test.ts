import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mocks = vi.hoisted(() => ({
  getManageContext: vi.fn(),
  getFeatures: vi.fn(),
  createManagedCustomer: vi.fn(),
}))
vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))
vi.mock('@/lib/manage/customers', () => ({
  createManagedCustomer: mocks.createManagedCustomer,
}))
vi.mock('@/lib/features', () => ({ getFeatures: mocks.getFeatures }))
import { POST } from './route'
function request(body: string | Record<string, unknown>) {
  return new NextRequest('http://couriers.test/api/manage/customers', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}
function tenant() {
  return {
    id: 'ten_nkr',
    orgId: 'org_nkr',
    slug: 'nkr-express',
    name: 'North Kingston Runners',
    mailboxPrefix: 'NKR',
    status: 'ACTIVE' as const,
    createdAt: 1_785_427_200,
    updatedAt: 1_785_427_200,
  }
}
function ctx(
  role: 'super-admin' | 'admin' | 'staff',
  currentTenant: ReturnType<typeof tenant> | null = tenant()
) {
  return {
    role,
    tenant: currentTenant,
    userId: 'usr_ops',
    orgId: 'org_nkr',
  }
}
describe('POST /api/manage/customers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getManageContext.mockResolvedValue(ctx('admin'))
    mocks.getFeatures.mockResolvedValue({ customerCreation: true })
    mocks.createManagedCustomer.mockResolvedValue({
      data: { id: 'cprof_nkr' },
      error: null,
    })
  })
  it('returns 401 with no session context', async () => {
    mocks.getManageContext.mockResolvedValue(null)
    const response = await POST(
      request({
        orgSlug: 'nkr-express',
        source: 'party',
        idempotencyKey: 'submission-nkr-001',
        party: { firstName: 'Marlon' },
        branchId: 'br_kingston',
      })
    )
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      data: null,
      error: { code: 'auth/no-session', message: 'Unauthorized.' },
    })
    expect(mocks.createManagedCustomer).not.toHaveBeenCalled()
  })
  it('returns auth/forbidden for a member', async () => {
    mocks.getManageContext.mockResolvedValue(ctx('staff'))
    const response = await POST(
      request({
        orgSlug: 'nkr-express',
        source: 'registry',
        billingCustomerId: 'cus_1',
        branchId: 'br_kingston',
      })
    )
    const body = await response.json()
    expect(response.status).toBe(403)
    expect(body.error.code).toBe('auth/forbidden')
    expect(mocks.createManagedCustomer).not.toHaveBeenCalled()
  })
  it('returns 404 with no tenant', async () => {
    mocks.getManageContext.mockResolvedValue(ctx('admin', null))
    const response = await POST(
      request({
        orgSlug: 'nkr-express',
        source: 'registry',
        billingCustomerId: 'cus_1',
        branchId: 'br_kingston',
      })
    )
    expect(response.status).toBe(404)
    expect(mocks.createManagedCustomer).not.toHaveBeenCalled()
  })
  it('returns 422 for malformed JSON', async () => {
    const response = await POST(request('{bad'))
    expect(response.status).toBe(422)
    expect(mocks.getManageContext).not.toHaveBeenCalled()
    expect(mocks.createManagedCustomer).not.toHaveBeenCalled()
  })
  it('returns 422 for a business with no company name', async () => {
    const response = await POST(
      request({
        orgSlug: 'nkr-express',
        source: 'party',
        idempotencyKey: 'submission-nkr-001',
        party: { customerKind: 'BUSINESS' },
        branchId: 'br_kingston',
      })
    )
    expect(response.status).toBe(422)
    expect(mocks.createManagedCustomer).not.toHaveBeenCalled()
  })
  it('creates a valid customer without passing orgSlug as a parameter', async () => {
    const response = await POST(
      request({
        orgSlug: 'nkr-express',
        source: 'party',
        idempotencyKey: 'submission-nkr-001',
        party: {
          customerKind: 'INDIVIDUAL',
          firstName: 'Marlon',
          lastName: 'Brown',
        },
        branchId: 'br_kingston',
      })
    )
    const body = await response.json()
    expect(response.status).toBe(201)
    expect(body).toEqual({ data: { id: 'cprof_nkr' }, error: null })
    expect(mocks.createManagedCustomer).toHaveBeenCalledTimes(1)
    expect(mocks.createManagedCustomer).toHaveBeenCalledWith({
      tenant: tenant(),
      params: {
        source: 'party',
        idempotencyKey: 'submission-nkr-001',
        party: {
          customerKind: 'INDIVIDUAL',
          firstName: 'Marlon',
          lastName: 'Brown',
        },
        branchId: 'br_kingston',
      },
    })
  })
  it('creates a profile for an existing registry party', async () => {
    const response = await POST(
      request({
        orgSlug: 'nkr-express',
        source: 'registry',
        billingCustomerId: 'cus_existing',
        branchId: 'br_kingston',
      })
    )

    expect(response.status).toBe(201)
    expect(mocks.createManagedCustomer).toHaveBeenCalledWith({
      tenant: tenant(),
      params: {
        source: 'registry',
        billingCustomerId: 'cus_existing',
        branchId: 'br_kingston',
      },
    })
  })
  it.each([
    ['neither source', { orgSlug: 'nkr-express', branchId: 'br_kingston' }],
    [
      'both source fields',
      {
        orgSlug: 'nkr-express',
        source: 'registry',
        billingCustomerId: 'cus_existing',
        branchId: 'br_kingston',
        party: { firstName: 'Ada' },
      },
    ],
    [
      'missing branch',
      {
        orgSlug: 'nkr-express',
        source: 'registry',
        billingCustomerId: 'cus_existing',
      },
    ],
  ])('returns 422 for %s', async (_name, body) => {
    const response = await POST(request(body))

    expect(response.status).toBe(422)
    expect(mocks.createManagedCustomer).not.toHaveBeenCalled()
  })
  it('preserves a profile conflict as customer/already-exists', async () => {
    mocks.createManagedCustomer.mockResolvedValue({
      data: null,
      error: 'This party is already a Couriers customer.',
      code: 'customer/already-exists',
      status: 409,
    })

    const response = await POST(
      request({
        orgSlug: 'nkr-express',
        source: 'registry',
        billingCustomerId: 'cus_existing',
        branchId: 'br_kingston',
      })
    )

    expect(response.status).toBe(409)
    expect((await response.json()).error.code).toBe('customer/already-exists')
  })
  it('returns creation-paused without calling the service', async () => {
    mocks.getFeatures.mockResolvedValue({ customerCreation: false })
    const response = await POST(
      request({
        source: 'registry',
        orgSlug: 'nkr-express',
        billingCustomerId: 'cus_1',
        branchId: 'br_kingston',
      })
    )
    expect(response.status).toBe(403)
    expect((await response.json()).error.code).toBe('customer/creation-paused')
    expect(mocks.createManagedCustomer).not.toHaveBeenCalled()
  })
})
