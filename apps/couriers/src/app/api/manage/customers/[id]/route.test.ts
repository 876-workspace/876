import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mocks = vi.hoisted(() => ({
  getManageContext: vi.fn(),
  updateManagedCustomer: vi.fn(),
  client: {
    customers: {
      delete: vi.fn(),
    },
  },
  getCouriers: vi.fn(),
  couriersErrorStatus: vi.fn((error: { code: string }) => {
    if (error.code.endsWith('/not-found')) return 404
    if (error.code === 'request/invalid') return 422
    if (
      error.code.endsWith('/conflict') ||
      error.code.endsWith('/in-use') ||
      error.code.endsWith('/already-exists')
    )
      return 409
    if (error.code.endsWith('/unavailable')) return 503
    return 502
  }),
}))
vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))
vi.mock('@/lib/manage/customers', () => ({
  updateManagedCustomer: mocks.updateManagedCustomer,
}))
vi.mock('@/lib/services/couriers', () => ({
  getCouriers: mocks.getCouriers,
}))
vi.mock('@/lib/couriers', () => ({
  couriersErrorStatus: mocks.couriersErrorStatus,
}))
import { getError } from '@/lib/errors'
import { DELETE, PATCH } from './route'
const context = { params: Promise.resolve({ id: 'cprof_nkr' }) }
function patch(body: string | Record<string, unknown>) {
  return new NextRequest(
    'http://couriers.test/api/manage/customers/cprof_nkr',
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }
  )
}
function delRequest(
  url = 'http://couriers.test/api/manage/customers/cprof_nkr?orgSlug=nkr-express',
  body?: Record<string, unknown>
) {
  return new NextRequest(url, {
    method: 'DELETE',
    ...(body === undefined
      ? {}
      : {
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        }),
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
  return { role, tenant: currentTenant, userId: 'usr_ops' }
}
describe('customer [id] route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getCouriers.mockImplementation(() => mocks.client)
    mocks.getManageContext.mockResolvedValue(ctx('admin'))
    mocks.updateManagedCustomer.mockResolvedValue({
      data: { id: 'cprof_nkr' },
      error: null,
    })
    mocks.client.customers.delete.mockResolvedValue({
      data: {
        object: 'courier_customer_profile',
        id: 'cprof_nkr',
        deleted: true,
      },
      error: null,
    })
  })
  describe('PATCH', () => {
    it('returns 401 with no session', async () => {
      mocks.getManageContext.mockResolvedValue(null)
      const response = await PATCH(
        patch({ orgSlug: 'nkr-express', branchId: 'br_mobay' }),
        context
      )
      expect(response.status).toBe(401)
      expect(mocks.updateManagedCustomer).not.toHaveBeenCalled()
    })
    it('returns auth/forbidden for a member', async () => {
      mocks.getManageContext.mockResolvedValue(ctx('staff'))
      const response = await PATCH(
        patch({ orgSlug: 'nkr-express', branchId: 'br_mobay' }),
        context
      )
      const body = await response.json()
      expect(response.status).toBe(403)
      expect(body.error.code).toBe('auth/forbidden')
      expect(mocks.updateManagedCustomer).not.toHaveBeenCalled()
    })
    it('returns 404 without a tenant', async () => {
      mocks.getManageContext.mockResolvedValue(ctx('admin', null))
      const response = await PATCH(
        patch({ orgSlug: 'nkr-express', branchId: 'br_mobay' }),
        context
      )
      expect(response.status).toBe(404)
      expect(mocks.updateManagedCustomer).not.toHaveBeenCalled()
    })
    it('returns 422 for malformed or invalid customer params', async () => {
      const malformed = await PATCH(patch('{bad'), context)
      expect(malformed.status).toBe(422)
      const invalid = await PATCH(
        patch({ orgSlug: 'nkr-express', status: 'ARCHIVED' }),
        context
      )
      expect(invalid.status).toBe(422)
      expect(mocks.updateManagedCustomer).not.toHaveBeenCalled()
    })
    it('updates with the exact tenant, id, and parsed params', async () => {
      const response = await PATCH(
        patch({
          orgSlug: 'nkr-express',
          branchId: 'br_mobay',
          trn: '123-456-789',
          isCommercial: true,
        }),
        context
      )
      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({
        data: { id: 'cprof_nkr' },
        error: null,
      })
      expect(mocks.updateManagedCustomer).toHaveBeenCalledTimes(1)
      expect(mocks.updateManagedCustomer).toHaveBeenCalledWith({
        tenant: tenant(),
        id: 'cprof_nkr',
        params: {
          branchId: 'br_mobay',
          trn: '123-456-789',
          isCommercial: true,
        },
      })
    })
  })
  describe('DELETE', () => {
    it('returns 422 for a missing orgSlug', async () => {
      const response = await DELETE(
        new NextRequest('http://couriers.test/api/manage/customers/cprof_nkr', {
          method: 'DELETE',
        }),
        context
      )
      expect(response.status).toBe(422)
      expect(mocks.client.customers.delete).not.toHaveBeenCalled()
    })
    it('returns 401 with no session', async () => {
      mocks.getManageContext.mockResolvedValue(null)
      const response = await DELETE(delRequest(), context)
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error.code).toBe('auth/no-session')
      expect(mocks.client.customers.delete).not.toHaveBeenCalled()
    })
    it('returns auth/forbidden for a member', async () => {
      mocks.getManageContext.mockResolvedValue(ctx('staff'))
      const response = await DELETE(delRequest(), context)
      const body = await response.json()
      expect(response.status).toBe(403)
      expect(body.error.code).toBe('auth/forbidden')
      expect(mocks.client.customers.delete).not.toHaveBeenCalled()
    })
    it('returns 404 without a tenant', async () => {
      mocks.getManageContext.mockResolvedValue(ctx('admin', null))
      const response = await DELETE(delRequest(), context)
      expect(response.status).toBe(404)
      expect(mocks.client.customers.delete).not.toHaveBeenCalled()
    })
    it('maps a Couriers not-found error through the registry', async () => {
      mocks.client.customers.delete.mockResolvedValue({
        data: null,
        error: { code: 'customer/not-found', message: 'Not found.' },
      })
      const response = await DELETE(delRequest(), context)
      expect(response.status).toBe(404)
      expect(await response.json()).toEqual({
        data: null,
        error: {
          code: 'customer/not-found',
          message: getError('customer/not-found').message,
        },
      })
      expect(mocks.couriersErrorStatus).not.toHaveBeenCalled()
      expect(mocks.client.customers.delete).toHaveBeenCalledTimes(1)
    })
    it('deletes with the exact tenant, id, and audit body', async () => {
      const response = await DELETE(delRequest(), context)
      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({
        data: { id: 'cprof_nkr', deleted: true },
        error: null,
      })
      expect(mocks.client.customers.delete).toHaveBeenCalledTimes(1)
      expect(mocks.client.customers.delete).toHaveBeenCalledWith('cprof_nkr', {
        deleted_by: 'usr_ops',
      })
    })
    it('does not allow the browser to override the audit actor', async () => {
      const response = await DELETE(
        delRequest(
          'http://couriers.test/api/manage/customers/cprof_nkr?orgSlug=nkr-express',
          {
            deleted_by: 'usr_spoofed',
          }
        ),
        context
      )
      expect(response.status).toBe(200)
      expect(mocks.client.customers.delete).toHaveBeenCalledWith('cprof_nkr', {
        deleted_by: 'usr_ops',
      })
    })
    it('strips the wire object discriminator from the browser response', async () => {
      mocks.client.customers.delete.mockResolvedValue({
        data: {
          object: 'courier_customer_profile',
          id: 'cprof_nkr',
          deleted: true,
        },
        error: null,
      })
      const response = await DELETE(delRequest(), context)
      const body = await response.json()
      expect(body).toEqual({
        data: { id: 'cprof_nkr', deleted: true },
        error: null,
      })
      expect(body.data).not.toHaveProperty('object')
    })
  })
})
