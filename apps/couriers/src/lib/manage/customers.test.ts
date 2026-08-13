import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  get876Client: vi.fn(),
}))

vi.mock('@/lib/876', () => ({
  get876Client: mocks.get876Client,
}))
vi.mock('@/lib/couriers', () => ({
  couriersErrorStatus: (error: { code: string }) =>
    error.code.endsWith('/not-found') ? 404 : 502,
  toCustomerView: (customer: Record<string, unknown>) => ({
    id: customer.id,
    tenantId: customer.tenant_id,
    userId: customer.user_id,
    billingCustomerId: customer.billing_customer_id,
    branchId: customer.branch_id,
    status: customer.status,
    trn: customer.trn,
    isCommercial: customer.is_commercial,
    firstSeenAt: customer.first_seen_at,
    createdAt: customer.created_at,
    updatedAt: customer.updated_at,
  }),
}))

import { createManagedCustomer, updateManagedCustomer } from './customers'

const tenant = {
  id: 'ten_nkr',
  orgId: 'org_nkr',
  slug: 'nkr-express',
  name: 'North Kingston Runners',
  mailboxPrefix: 'NKR',
  status: 'ACTIVE' as const,
  createdAt: 1,
  updatedAt: 1,
}

const courierCustomer = {
  object: 'courier_customer_profile' as const,
  id: 'cprof_nkr',
  tenant_id: tenant.id,
  user_id: null,
  billing_customer_id: 'cus_nkr',
  branch_id: 'br_kingston',
  status: 'ACTIVE' as const,
  trn: null,
  is_commercial: false,
  first_seen_at: 1,
  created_at: 1,
  updated_at: 1,
  deleted_at: null,
}

describe('managed customers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.get876Client.mockImplementation(() => ({
      customers: { create: mocks.create, update: mocks.update },
    }))
    mocks.create.mockResolvedValue({ data: courierCustomer, error: null })
    mocks.update.mockResolvedValue({ data: courierCustomer, error: null })
  })

  it('creates via the unified couriers customer domain operation with idempotency', async () => {
    const result = await createManagedCustomer({
      tenant,
      params: {
        idempotencyKey: 'submission-nkr-001',
        firstName: 'Marlon',
        branchId: 'br_kingston',
        isCommercial: true,
      },
    })

    expect(result).toEqual({
      data: expect.objectContaining({ id: courierCustomer.id }),
      error: null,
    })
    expect(mocks.create).toHaveBeenCalledWith({
      mode: 'new',
      idempotencyKey: 'submission-nkr-001',
      customerKind: 'INDIVIDUAL',
      firstName: 'Marlon',
      lastName: undefined,
      companyName: undefined,
      email: undefined,
      phone: undefined,
      branchId: 'br_kingston',
      status: undefined,
      isCommercial: true,
      trn: undefined,
    })
  })

  it('propagates registry-unavailable without masking', async () => {
    mocks.create.mockResolvedValue({
      data: null,
      error: { code: 'customer/registry-unavailable', message: 'Unavailable.' },
    })

    await expect(
      createManagedCustomer({
        tenant,
        params: { idempotencyKey: 'submission-nkr-002', firstName: 'Marlon' },
      })
    ).resolves.toMatchObject({
      data: null,
      code: 'customer/registry-unavailable',
    })
  })

  it('returns couriers mailbox error without masking', async () => {
    mocks.create.mockResolvedValue({
      data: null,
      error: { code: 'mailbox/allocation-exhausted', message: 'No mailbox.' },
    })

    await expect(
      createManagedCustomer({
        tenant,
        params: { idempotencyKey: 'submission-nkr-003', firstName: 'Marlon' },
      })
    ).resolves.toMatchObject({
      data: null,
      code: 'mailbox/allocation-exhausted',
    })
  })

  it('delegates identity-lock handling to couriers-api', async () => {
    mocks.update.mockResolvedValue({
      data: null,
      error: { code: 'customer/identity-locked', message: 'Locked.' },
    })

    await expect(
      updateManagedCustomer({
        tenant,
        id: courierCustomer.id,
        params: { firstName: 'Andre' },
      })
    ).resolves.toMatchObject({
      data: null,
      code: 'customer/identity-locked',
    })
    expect(mocks.update).toHaveBeenCalledWith(
      courierCustomer.id,
      expect.objectContaining({ firstName: 'Andre' })
    )
  })

  it('forwards courier-owned fields to the domain update', async () => {
    await expect(
      updateManagedCustomer({
        tenant,
        id: courierCustomer.id,
        params: { branchId: 'br_mobay', trn: '123456789' },
      })
    ).resolves.toEqual({
      data: expect.objectContaining({ id: courierCustomer.id }),
      error: null,
    })
    expect(mocks.update).toHaveBeenCalledWith(courierCustomer.id, {
      branchId: 'br_mobay',
      trn: '123456789',
    })
  })
})
