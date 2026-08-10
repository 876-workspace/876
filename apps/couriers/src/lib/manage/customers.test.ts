import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
}))

vi.mock('@/lib/876', () => ({
  $876: {
    couriers: {
      customers: {
        create: mocks.create,
        update: mocks.update,
      },
    },
  },
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
    expect(mocks.create).toHaveBeenCalledWith(tenant.id, {
      idempotency_key: 'submission-nkr-001',
      customer_kind: 'INDIVIDUAL',
      first_name: 'Marlon',
      last_name: null,
      company_name: null,
      email: null,
      phone: null,
      branch_id: 'br_kingston',
      status: undefined,
      is_commercial: true,
      trn: null,
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
    expect(mocks.update).toHaveBeenCalledWith(tenant.id, courierCustomer.id, expect.objectContaining({ first_name: 'Andre' }))
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
    expect(mocks.update).toHaveBeenCalledWith(tenant.id, courierCustomer.id, {
      branch_id: 'br_mobay',
      trn: '123456789',
    })
  })
})
