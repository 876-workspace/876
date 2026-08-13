import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createPortalCouriersClient: vi.fn(),
  get876Client: vi.fn(),
  billingIntegration: {},
  ensureSharedCoreUserCustomer: vi.fn(),
  retrieve: vi.fn(),
  shippingAddress: vi.fn(),
  enroll: vi.fn(),
}))

vi.mock('./client', () => ({
  createPortalCouriersClient: mocks.createPortalCouriersClient,
  isPortalNotFound: (result: { error: { code: string } | null }) =>
    result.error?.code.endsWith('/not-found') ?? false,
}))
vi.mock('@/lib/876', () => ({
  get876Client: mocks.get876Client,
  billingIntegration: mocks.billingIntegration,
}))
vi.mock('@/lib/finance/customers', () => ({
  ensureSharedCoreUserCustomer: mocks.ensureSharedCoreUserCustomer,
}))

import { ensurePortalCustomer } from './enroll'

const tenant = {
  id: 'ten_rocketship',
  orgId: 'org_rocketship',
  slug: 'rocketship',
  name: 'Rocketship Couriers Jamaica',
  mailboxPrefix: 'RSJ',
  status: 'ACTIVE' as const,
  createdAt: 1_784_419_200,
  updatedAt: 1_784_419_200,
}

const customer = {
  object: 'courier_customer_profile' as const,
  id: 'cprof_kimani',
  tenant_id: tenant.id,
  user_id: 'user_kimani',
  billing_customer_id: 'blcus_kimani',
  branch_id: 'br_kingston',
  status: 'ACTIVE' as const,
  is_commercial: false,
  first_seen_at: 1_784_419_200,
  created_at: 1_784_419_200,
  updated_at: 1_784_419_200,
  deleted_at: null,
}

const mailbox = {
  object: 'mailbox' as const,
  id: 'mbx_rsj1001',
  tenant_id: tenant.id,
  customer_id: customer.id,
  number: 'RSJ1001',
  is_primary: true,
  created_at: 1_784_419_200,
  updated_at: 1_784_419_200,
}

function params() {
  return {
    tenant,
    userId: 'user_kimani',
    email: 'kimani@rocketship.test',
    firstName: 'Kimani',
    lastName: 'Brown',
    accessToken: 'portal-access-token',
  }
}

describe('ensurePortalCustomer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createPortalCouriersClient.mockReturnValue({
      portal: {
        customer: { retrieve: mocks.retrieve },
        shippingAddress: { retrieve: mocks.shippingAddress },
        enrollments: { create: mocks.enroll },
      },
    })
    mocks.get876Client.mockResolvedValue({ billing: 'billing-client' })
    mocks.ensureSharedCoreUserCustomer.mockResolvedValue({
      data: { id: customer.billing_customer_id },
      error: null,
    })
    mocks.shippingAddress.mockResolvedValue({
      data: {
        warehouse: null,
        mailbox: { id: mailbox.id, number: mailbox.number },
      },
      error: null,
    })
    mocks.enroll.mockResolvedValue({
      data: {
        object: 'courier_customer_enrollment',
        customer,
        mailbox,
      },
      error: null,
    })
  })

  it('reuses an existing profile and retrieves its assigned mailbox via session endpoints', async () => {
    mocks.retrieve.mockResolvedValue({ data: customer, error: null })

    const result = await ensurePortalCustomer(params())

    expect(result).toEqual({
      data: expect.objectContaining({
        id: customer.id,
        tenantId: tenant.id,
        primaryMailboxNumber: mailbox.number,
      }),
      error: null,
    })
    expect(mocks.createPortalCouriersClient).toHaveBeenCalledWith(
      'portal-access-token'
    )
    expect(mocks.shippingAddress).toHaveBeenCalledWith(tenant.id)
    expect(mocks.ensureSharedCoreUserCustomer).not.toHaveBeenCalled()
    expect(mocks.enroll).not.toHaveBeenCalled()
  })

  it('creates the billing customer then atomically enrolls the missing portal profile', async () => {
    mocks.retrieve.mockResolvedValue({
      data: null,
      error: { code: 'customer/not-found', message: 'Not found.' },
    })

    const result = await ensurePortalCustomer(params())

    expect(result).toEqual({
      data: expect.objectContaining({ primaryMailboxNumber: mailbox.number }),
      error: null,
    })
    expect(mocks.ensureSharedCoreUserCustomer).toHaveBeenCalledWith(
      mocks.billingIntegration,
      tenant.orgId,
      {
        id: 'user_kimani',
        email: 'kimani@rocketship.test',
        firstName: 'Kimani',
        lastName: 'Brown',
      }
    )
    expect(mocks.enroll).toHaveBeenCalledWith(tenant.id, {
      billing_customer_id: customer.billing_customer_id,
    })
  })

  it('does not enroll when Billing cannot ensure the shared customer', async () => {
    mocks.retrieve.mockResolvedValue({
      data: null,
      error: { code: 'customer/not-found', message: 'Not found.' },
    })
    mocks.ensureSharedCoreUserCustomer.mockResolvedValue({
      data: null,
      error: { code: 'billing/unavailable', message: 'Unavailable.' },
    })

    await expect(ensurePortalCustomer(params())).resolves.toMatchObject({
      data: null,
      code: 'portal/billing-unavailable',
    })
    expect(mocks.enroll).not.toHaveBeenCalled()
  })

  it('maps exhausted mailbox allocation to the existing portal-safe error', async () => {
    mocks.retrieve.mockResolvedValue({
      data: null,
      error: { code: 'customer/not-found', message: 'Not found.' },
    })
    mocks.enroll.mockResolvedValue({
      data: null,
      error: {
        code: 'mailbox/allocation-exhausted',
        message: 'No mailbox.',
      },
    })

    await expect(ensurePortalCustomer(params())).resolves.toMatchObject({
      data: null,
      code: 'portal/mailbox-unavailable',
    })
  })
})
