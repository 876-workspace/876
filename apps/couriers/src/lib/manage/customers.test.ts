import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  get876Client: vi.fn(),
  createExternalCustomer: vi.fn(),
  updateExternalCustomer: vi.fn(),
  generateId: vi.fn(),
  allocate: vi.fn(),
  create: vi.fn(),
  retrieve: vi.fn(),
  update: vi.fn(),
  registryRetrieve: vi.fn(),
}))
vi.mock('@/lib/876', () => ({ get876Client: mocks.get876Client }))
vi.mock('@/lib/finance/customers', () => ({
  createExternalCustomer: mocks.createExternalCustomer,
  updateExternalCustomer: mocks.updateExternalCustomer,
}))
vi.mock('@/lib/id', () => ({ generateId: mocks.generateId }))
vi.mock('@/lib/service', () => ({
  service: {
    mailboxes: { allocate: mocks.allocate },
    customerProfiles: {
      create: mocks.create,
      retrieve: mocks.retrieve,
      update: mocks.update,
    },
  },
}))
import { createManagedCustomer, updateManagedCustomer } from './customers'

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
function customer(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cus_nkr',
    customerType: 'EXTERNAL',
    customerKind: 'INDIVIDUAL',
    firstName: 'Marlon',
    lastName: 'Brown',
    companyName: null,
    email: 'marlon.brown@example.jm',
    phone: '+18765550142',
    ...overrides,
  }
}
function profile(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cprof_nkr',
    tenantId: 'ten_nkr',
    billingCustomerId: 'cus_nkr',
    ...overrides,
  }
}
function view() {
  return {
    id: 'cprof_nkr',
    tenantId: 'ten_nkr',
    userId: null,
    billingCustomerId: 'cus_nkr',
    branchId: 'br_kingston',
    status: 'ACTIVE',
    trn: null,
    isCommercial: false,
    firstSeenAt: 1,
    createdAt: 1,
    updatedAt: 1,
  }
}

describe('managed customers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.generateId.mockReturnValue('cprof_nkr')
    mocks.allocate.mockResolvedValue({
      data: { number: 'KNG-1042' },
      error: null,
    })
    mocks.get876Client.mockResolvedValue({
      billing: { customers: { retrieve: mocks.registryRetrieve } },
    })
    mocks.createExternalCustomer.mockResolvedValue({
      data: customer(),
      error: null,
    })
    mocks.updateExternalCustomer.mockResolvedValue({
      data: customer(),
      error: null,
    })
    mocks.create.mockResolvedValue({ data: view(), error: null })
    mocks.retrieve.mockResolvedValue(profile())
    mocks.update.mockResolvedValue({ data: view(), error: null })
    mocks.registryRetrieve.mockResolvedValue({ data: customer(), error: null })
  })
  describe('createManagedCustomer', () => {
    it('allocates a mailbox, registers the customer, then creates its profile using one shared idempotency anchor', async () => {
      const result = await createManagedCustomer({
        tenant: tenant(),
        params: {
          customerKind: 'INDIVIDUAL',
          firstName: 'Marlon',
          lastName: 'Brown',
          branchId: 'br_kingston',
          trn: '123-456-789',
          isCommercial: true,
        },
      })
      expect(result).toEqual({ data: view(), error: null })
      expect(mocks.allocate).toHaveBeenCalledTimes(1)
      expect(mocks.allocate).toHaveBeenCalledWith({ tenantId: 'ten_nkr' })
      expect(mocks.createExternalCustomer).toHaveBeenCalledTimes(1)
      expect(mocks.createExternalCustomer).toHaveBeenCalledWith(
        expect.anything(),
        'org_nkr',
        {
          profileId: 'cprof_nkr',
          customerKind: 'INDIVIDUAL',
          firstName: 'Marlon',
          lastName: 'Brown',
          companyName: null,
          email: null,
          phone: null,
        }
      )
      expect(mocks.create).toHaveBeenCalledTimes(1)
      expect(mocks.create).toHaveBeenCalledWith('ten_nkr', {
        id: 'cprof_nkr',
        billingCustomerId: 'cus_nkr',
        userId: null,
        mailboxNumber: 'KNG-1042',
        branchId: 'br_kingston',
        trn: '123-456-789',
        isCommercial: true,
        status: undefined,
      })
      expect(mocks.allocate.mock.invocationCallOrder[0]).toBeLessThan(
        mocks.createExternalCustomer.mock.invocationCallOrder[0]
      )
      expect(
        mocks.createExternalCustomer.mock.invocationCallOrder[0]
      ).toBeLessThan(mocks.create.mock.invocationCallOrder[0])
    })
    it('returns registry-unavailable without writing a profile when registry creation fails', async () => {
      mocks.createExternalCustomer.mockResolvedValue({
        data: null,
        error: { code: 'billing/unavailable', message: 'Billing unavailable.' },
      })
      const result = await createManagedCustomer({
        tenant: tenant(),
        params: { firstName: 'Marlon' },
      })
      expect(result).toEqual({
        data: null,
        error: 'The customer registry is unavailable. Please try again.',
        status: 502,
        code: 'customer/registry-unavailable',
      })
      expect(mocks.create).not.toHaveBeenCalled()
    })
    it('returns mailbox-unavailable before making a registry call when allocation fails', async () => {
      mocks.allocate.mockResolvedValue({
        data: null,
        error: 'Mailbox pool empty.',
      })
      const result = await createManagedCustomer({
        tenant: tenant(),
        params: { firstName: 'Marlon' },
      })
      expect(result).toEqual({
        data: null,
        error: 'A mailbox number could not be allocated. Please try again.',
        status: 503,
        code: 'customer/mailbox-unavailable',
      })
      expect(mocks.createExternalCustomer).not.toHaveBeenCalled()
      expect(mocks.create).not.toHaveBeenCalled()
    })
  })
  describe('updateManagedCustomer', () => {
    it('updates courier fields when a CORE_USER edit echoes identical registry identity fields', async () => {
      mocks.registryRetrieve.mockResolvedValue({
        data: customer({ customerType: 'CORE_USER' }),
        error: null,
      })
      const result = await updateManagedCustomer({
        tenant: tenant(),
        id: 'cprof_nkr',
        params: {
          firstName: 'Marlon',
          lastName: 'Brown',
          email: 'marlon.brown@example.jm',
          phone: '+18765550142',
          branchId: 'br_mobay',
          trn: '123-456-789',
        },
      })
      expect(result).toEqual({ data: view(), error: null })
      expect(mocks.updateExternalCustomer).not.toHaveBeenCalled()
      expect(mocks.update).toHaveBeenCalledTimes(1)
      expect(mocks.update).toHaveBeenCalledWith('ten_nkr', 'cprof_nkr', {
        branchId: 'br_mobay',
        status: undefined,
        trn: '123-456-789',
        isCommercial: undefined,
      })
    })
    it('locks changed identity fields for a CORE_USER without registry mutation', async () => {
      mocks.registryRetrieve.mockResolvedValue({
        data: customer({ customerType: 'CORE_USER' }),
        error: null,
      })
      const result = await updateManagedCustomer({
        tenant: tenant(),
        id: 'cprof_nkr',
        params: { firstName: 'Andre' },
      })
      expect(result).toEqual({
        data: null,
        error: "This customer's identity is managed by their 876 account.",
        status: 409,
        code: 'customer/identity-locked',
      })
      expect(mocks.updateExternalCustomer).not.toHaveBeenCalled()
      expect(mocks.update).not.toHaveBeenCalled()
    })
    it('merges an EXTERNAL identity change over current registry fields using its registry kind', async () => {
      mocks.registryRetrieve.mockResolvedValue({
        data: customer({
          customerKind: 'BUSINESS',
          companyName: 'Brown Logistics Ltd.',
          firstName: null,
          lastName: null,
        }),
        error: null,
      })
      const result = await updateManagedCustomer({
        tenant: tenant(),
        id: 'cprof_nkr',
        params: {
          companyName: 'Brown Logistics Jamaica Ltd.',
          trn: '123-456-789',
        },
      })
      expect(result).toEqual({ data: view(), error: null })
      expect(mocks.updateExternalCustomer).toHaveBeenCalledTimes(1)
      expect(mocks.updateExternalCustomer).toHaveBeenCalledWith(
        expect.anything(),
        'org_nkr',
        'cus_nkr',
        {
          customerKind: 'BUSINESS',
          firstName: null,
          lastName: null,
          companyName: 'Brown Logistics Jamaica Ltd.',
          email: 'marlon.brown@example.jm',
          phone: '+18765550142',
        }
      )
    })
    it('returns customer/not-found before calling the registry for a missing profile', async () => {
      mocks.retrieve.mockResolvedValue(null)
      const result = await updateManagedCustomer({
        tenant: tenant(),
        id: 'cprof_missing',
        params: { firstName: 'Marlon' },
      })
      expect(result).toEqual({
        data: null,
        error: 'The requested customer was not found.',
        status: 404,
        code: 'customer/not-found',
      })
      expect(mocks.get876Client).not.toHaveBeenCalled()
      expect(mocks.updateExternalCustomer).not.toHaveBeenCalled()
      expect(mocks.update).not.toHaveBeenCalled()
    })
  })
})
