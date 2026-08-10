import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  get876Client: vi.fn(),
  createExternalCustomer: vi.fn(),
  updateExternalCustomer: vi.fn(),
  enroll: vi.fn(),
  retrieve: vi.fn(),
  update: vi.fn(),
  registryRetrieve: vi.fn(),
}))

vi.mock('@/lib/876', () => ({ get876Client: mocks.get876Client }))
vi.mock('@/lib/finance/customers', () => ({
  createExternalCustomer: mocks.createExternalCustomer,
  updateExternalCustomer: mocks.updateExternalCustomer,
}))
vi.mock('@/lib/couriers', () => ({
  $couriers: {
    customers: {
      enroll: mocks.enroll,
      retrieve: mocks.retrieve,
      update: mocks.update,
    },
  },
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

const registryCustomer = {
  id: 'cus_nkr',
  customerType: 'EXTERNAL',
  customerKind: 'INDIVIDUAL',
  firstName: 'Marlon',
  lastName: 'Brown',
  companyName: null,
  email: 'marlon.brown@example.jm',
  phone: '+18765550142',
}

describe('managed customers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.get876Client.mockResolvedValue({
      billing: { customers: { retrieve: mocks.registryRetrieve } },
    })
    mocks.createExternalCustomer.mockResolvedValue({
      data: registryCustomer,
      error: null,
    })
    mocks.updateExternalCustomer.mockResolvedValue({
      data: registryCustomer,
      error: null,
    })
    mocks.enroll.mockResolvedValue({
      data: {
        object: 'courier_customer_enrollment',
        customer: courierCustomer,
      },
      error: null,
    })
    mocks.retrieve.mockResolvedValue({ data: courierCustomer, error: null })
    mocks.update.mockResolvedValue({ data: courierCustomer, error: null })
    mocks.registryRetrieve.mockResolvedValue({
      data: registryCustomer,
      error: null,
    })
  })

  it('uses Billing idempotency before atomically enrolling the Couriers profile', async () => {
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
    expect(mocks.createExternalCustomer).toHaveBeenCalledWith(
      expect.anything(),
      tenant.orgId,
      expect.objectContaining({ idempotencyKey: 'submission-nkr-001' })
    )
    expect(mocks.enroll).toHaveBeenCalledWith(tenant.id, {
      billing_customer_id: registryCustomer.id,
      branch_id: 'br_kingston',
      status: undefined,
      is_commercial: true,
    })
  })

  it('does not enroll when registry creation fails', async () => {
    mocks.createExternalCustomer.mockResolvedValue({
      data: null,
      error: { code: 'billing/unavailable', message: 'Unavailable.' },
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
    expect(mocks.enroll).not.toHaveBeenCalled()
  })

  it('returns the Couriers enrollment error without masking its safe code', async () => {
    mocks.enroll.mockResolvedValue({
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

  it('prevents an identity change for a core-user registry customer', async () => {
    mocks.registryRetrieve.mockResolvedValue({
      data: { ...registryCustomer, customerType: 'CORE_USER' },
      error: null,
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
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('updates Couriers fields after an allowed registry change', async () => {
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
