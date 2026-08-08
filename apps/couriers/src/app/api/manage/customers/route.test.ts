import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mocks = vi.hoisted(() => ({
  getManageContext: vi.fn(),
  createManagedCustomer: vi.fn(),
}))
vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))
vi.mock('@/lib/manage/customers', () => ({
  createManagedCustomer: mocks.createManagedCustomer,
}))
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
  role: 'owner' | 'admin' | 'member',
  currentTenant: ReturnType<typeof tenant> | null = tenant()
) {
  return { role, tenant: currentTenant, userId: 'usr_ops' }
}
describe('POST /api/manage/customers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getManageContext.mockResolvedValue(ctx('admin'))
    mocks.createManagedCustomer.mockResolvedValue({
      data: { id: 'cprof_nkr' },
      error: null,
    })
  })
  it('returns 401 with no session context', async () => {
    mocks.getManageContext.mockResolvedValue(null)
    const response = await POST(
      request({ orgSlug: 'nkr-express', firstName: 'Marlon' })
    )
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      data: null,
      error: { code: 'auth/no-session', message: 'Unauthorized.' },
    })
    expect(mocks.createManagedCustomer).not.toHaveBeenCalled()
  })
  it('returns auth/forbidden for a member', async () => {
    mocks.getManageContext.mockResolvedValue(ctx('member'))
    const response = await POST(
      request({ orgSlug: 'nkr-express', firstName: 'Marlon' })
    )
    const body = await response.json()
    expect(response.status).toBe(403)
    expect(body.error.code).toBe('auth/forbidden')
    expect(mocks.createManagedCustomer).not.toHaveBeenCalled()
  })
  it('returns 404 with no tenant', async () => {
    mocks.getManageContext.mockResolvedValue(ctx('admin', null))
    const response = await POST(
      request({ orgSlug: 'nkr-express', firstName: 'Marlon' })
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
      request({ orgSlug: 'nkr-express', customerKind: 'BUSINESS' })
    )
    expect(response.status).toBe(422)
    expect(mocks.createManagedCustomer).not.toHaveBeenCalled()
  })
  it('creates a valid customer without passing orgSlug as a parameter', async () => {
    const response = await POST(
      request({
        orgSlug: 'nkr-express',
        customerKind: 'INDIVIDUAL',
        firstName: 'Marlon',
        lastName: 'Brown',
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
        customerKind: 'INDIVIDUAL',
        firstName: 'Marlon',
        lastName: 'Brown',
        branchId: 'br_kingston',
      },
    })
  })
})
