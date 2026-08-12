import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  enrollManagedCustomer: vi.fn(),
  getManageContext: vi.fn(),
}))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))
vi.mock('@/lib/manage/customers', () => ({
  enrollManagedCustomer: mocks.enrollManagedCustomer,
}))

import { POST } from './route'

function request(body: string | Record<string, unknown>) {
  return new NextRequest(
    'http://couriers.test/api/manage/customers/enrollments',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }
  )
}

const tenant = {
  id: 'ten_nkr',
  orgId: 'org_nkr',
  slug: 'nkr-express',
  name: 'North Kingston Runners',
  mailboxPrefix: 'NKR',
  status: 'ACTIVE' as const,
  createdAt: 1_785_427_200,
  updatedAt: 1_785_427_200,
}

function context(role: 'owner' | 'admin' | 'member') {
  return { role, tenant, userId: 'usr_ops' }
}

describe('customer enrollments route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getManageContext.mockResolvedValue(context('admin'))
    mocks.enrollManagedCustomer.mockResolvedValue({
      data: { id: 'cprof_nkr', billingCustomerId: 'cust_global' },
      error: null,
    })
  })

  it('rejects malformed enrollment input before calling the service', async () => {
    const malformed = await POST(request('{bad'))
    const invalid = await POST(
      request({ orgSlug: 'nkr-express', billingCustomerId: 'cust_global' })
    )

    expect(malformed.status).toBe(422)
    expect(invalid.status).toBe(422)
    expect(mocks.enrollManagedCustomer).not.toHaveBeenCalled()
  })

  it('requires an owner or admin', async () => {
    mocks.getManageContext.mockResolvedValue(context('member'))

    const response = await POST(
      request({
        orgSlug: 'nkr-express',
        billingCustomerId: 'cust_global',
        branchId: 'br_kingston',
      })
    )

    expect(response.status).toBe(403)
    expect(mocks.enrollManagedCustomer).not.toHaveBeenCalled()
  })

  it('enrolls the global customer in the current Courier tenant', async () => {
    const response = await POST(
      request({
        orgSlug: 'nkr-express',
        billingCustomerId: 'cust_global',
        branchId: 'br_kingston',
        isCommercial: true,
      })
    )

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({
      data: { id: 'cprof_nkr', billingCustomerId: 'cust_global' },
      error: null,
    })
    expect(mocks.enrollManagedCustomer).toHaveBeenCalledTimes(1)
    expect(mocks.enrollManagedCustomer).toHaveBeenCalledWith({
      tenant,
      params: {
        billingCustomerId: 'cust_global',
        branchId: 'br_kingston',
        isCommercial: true,
      },
    })
  })

  it('preserves service errors and status codes', async () => {
    mocks.enrollManagedCustomer.mockResolvedValue({
      data: null,
      error: 'Customer is already enrolled.',
      status: 409,
      code: 'customer/already-exists',
    })

    const response = await POST(
      request({
        orgSlug: 'nkr-express',
        billingCustomerId: 'cust_global',
        branchId: 'br_kingston',
      })
    )

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      data: null,
      error: {
        code: 'customer/already-exists',
        message: 'Customer is already enrolled.',
      },
    })
  })
})
