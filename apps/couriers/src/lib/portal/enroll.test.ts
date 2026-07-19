import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CourierCustomerProfile, Mailbox, Tenant } from '@/lib/db'
import type { PortalCustomerEnsureParams } from '@/types/portal'

const mocks = vi.hoisted(() => ({
  getFinanceClient: vi.fn(),
  ensureSharedCoreUserCustomer: vi.fn(),
  retrieveByTenantAndUser: vi.fn(),
  customerProfileEnsure: vi.fn(),
  allocate: vi.fn(),
  listMailboxes: vi.fn(),
}))

vi.mock('@/lib/finance/client', () => ({
  getFinanceClient: mocks.getFinanceClient,
}))
vi.mock('@/lib/finance/customers', () => ({
  ensureSharedCoreUserCustomer: mocks.ensureSharedCoreUserCustomer,
}))
vi.mock('@/lib/service', () => ({
  service: {
    customerProfiles: {
      retrieveByTenantAndUser: mocks.retrieveByTenantAndUser,
      ensure: mocks.customerProfileEnsure,
    },
    mailboxes: {
      allocate: mocks.allocate,
      list: mocks.listMailboxes,
    },
  },
}))

import { ensurePortalCustomer } from './enroll'

const financeClient = { customers: { list: vi.fn(), create: vi.fn() } }

function createTenant(overrides: Partial<Tenant> = {}): Tenant {
  return {
    id: 'ten_rocketship',
    orgId: 'org_rocketship',
    slug: 'rocketship',
    name: 'Rocketship Couriers Jamaica',
    mailboxPrefix: 'RSJ',
    status: 'ACTIVE',
    createdAt: 1_784_419_200,
    updatedAt: 1_784_419_200,
    ...overrides,
  }
}

function createProfile(
  overrides: Partial<CourierCustomerProfile> = {}
): CourierCustomerProfile {
  return {
    id: 'cprof_kimani',
    tenantId: 'ten_rocketship',
    userId: 'user_kimani',
    billingCustomerId: 'blcus_kimani',
    branchId: 'br_kingston',
    status: 'ACTIVE',
    trn: null,
    isCommercial: false,
    firstSeenAt: 1_784_419_200,
    createdAt: 1_784_419_200,
    updatedAt: 1_784_419_200,
    ...overrides,
  }
}

function createMailbox(overrides: Partial<Mailbox> = {}): Mailbox {
  return {
    id: 'mbx_rsj1001',
    customerId: 'cprof_kimani',
    tenantId: 'ten_rocketship',
    number: 'RSJ1001',
    isPrimary: true,
    createdAt: 1_784_419_200,
    updatedAt: 1_784_419_200,
    ...overrides,
  }
}

function createParams(
  overrides: Partial<PortalCustomerEnsureParams> = {}
): PortalCustomerEnsureParams {
  return {
    tenant: createTenant(),
    userId: 'user_kimani',
    email: 'kimani@rocketship.test',
    firstName: 'Kimani',
    lastName: 'Brown',
    ...overrides,
  }
}

function expectBillingEnsureCall(params: PortalCustomerEnsureParams) {
  expect(mocks.getFinanceClient).toHaveBeenCalledTimes(1)
  expect(mocks.getFinanceClient).toHaveBeenCalledWith()
  expect(mocks.ensureSharedCoreUserCustomer).toHaveBeenCalledTimes(1)
  expect(mocks.ensureSharedCoreUserCustomer).toHaveBeenCalledWith(
    financeClient,
    params.tenant.orgId,
    {
      id: params.userId,
      email: params.email,
      firstName: params.firstName ?? null,
      lastName: params.lastName ?? null,
    }
  )
}

describe('ensurePortalCustomer', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.getFinanceClient.mockResolvedValue(financeClient)
    mocks.ensureSharedCoreUserCustomer.mockResolvedValue({
      data: { id: 'blcus_kimani' },
      error: null,
    })
    mocks.retrieveByTenantAndUser.mockResolvedValue(null)
    mocks.allocate.mockResolvedValue({
      data: { number: 'RSJ1001' },
      error: null,
    })
    mocks.listMailboxes.mockResolvedValue([])
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('returns an existing profile without billing or allocation work', async () => {
    const params = createParams()
    const profile = createProfile()
    const mailbox = createMailbox()
    mocks.retrieveByTenantAndUser.mockResolvedValue(profile)
    mocks.listMailboxes.mockResolvedValue([mailbox])

    const result = await ensurePortalCustomer(params)

    expect(result).toEqual({
      data: { ...profile, primaryMailboxNumber: 'RSJ1001' },
      error: null,
    })
    expect(mocks.retrieveByTenantAndUser).toHaveBeenCalledTimes(1)
    expect(mocks.retrieveByTenantAndUser).toHaveBeenCalledWith(
      'ten_rocketship',
      'user_kimani'
    )
    expect(mocks.listMailboxes).toHaveBeenCalledTimes(1)
    expect(mocks.listMailboxes).toHaveBeenCalledWith({
      tenantId: 'ten_rocketship',
      customerId: 'cprof_kimani',
    })
    expect(mocks.getFinanceClient).not.toHaveBeenCalled()
    expect(mocks.ensureSharedCoreUserCustomer).not.toHaveBeenCalled()
    expect(mocks.allocate).not.toHaveBeenCalled()
    expect(mocks.customerProfileEnsure).not.toHaveBeenCalled()
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })

  it('returns billing unavailable when Billing returns an error', async () => {
    const params = createParams()
    mocks.ensureSharedCoreUserCustomer.mockResolvedValue({
      data: null,
      error: {
        code: 'billing/provider-unavailable',
        message: 'Billing provider unavailable.',
      },
    })

    const result = await ensurePortalCustomer(params)

    expect(result).toEqual({
      data: null,
      error: 'Billing is temporarily unavailable. Please try again.',
      status: 503,
      code: 'portal/billing-unavailable',
    })
    expectBillingEnsureCall(params)
    expect(mocks.allocate).not.toHaveBeenCalled()
    expect(mocks.customerProfileEnsure).not.toHaveBeenCalled()
    expect(mocks.listMailboxes).not.toHaveBeenCalled()
  })

  it('returns billing unavailable when Billing returns null data without an error', async () => {
    const params = createParams({ firstName: undefined, lastName: null })
    mocks.ensureSharedCoreUserCustomer.mockResolvedValue({
      data: null,
      error: null,
    })

    const result = await ensurePortalCustomer(params)

    expect(result).toEqual({
      data: null,
      error: 'Billing is temporarily unavailable. Please try again.',
      status: 503,
      code: 'portal/billing-unavailable',
    })
    expectBillingEnsureCall(params)
    expect(mocks.allocate).not.toHaveBeenCalled()
    expect(mocks.customerProfileEnsure).not.toHaveBeenCalled()
    expect(mocks.listMailboxes).not.toHaveBeenCalled()
  })

  it('propagates the initial mailbox allocation failure', async () => {
    const params = createParams()
    const allocationFailure = {
      data: null,
      error: 'A mailbox number could not be allocated. Please try again.',
      status: 503,
    }
    mocks.allocate.mockResolvedValue(allocationFailure)

    const result = await ensurePortalCustomer(params)

    expect(result).toEqual(allocationFailure)
    expectBillingEnsureCall(params)
    expect(mocks.allocate).toHaveBeenCalledTimes(1)
    expect(mocks.allocate).toHaveBeenCalledWith({
      tenantId: 'ten_rocketship',
    })
    expect(mocks.customerProfileEnsure).not.toHaveBeenCalled()
    expect(mocks.listMailboxes).not.toHaveBeenCalled()
  })

  it('returns a concurrently-created profile after the first P2002 conflict', async () => {
    const params = createParams()
    const profile = createProfile()
    const mailbox = createMailbox()
    mocks.retrieveByTenantAndUser
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(profile)
    mocks.customerProfileEnsure.mockRejectedValue({ code: 'P2002' })
    mocks.listMailboxes.mockResolvedValue([mailbox])

    const result = await ensurePortalCustomer(params)

    expect(result).toEqual({
      data: { ...profile, primaryMailboxNumber: 'RSJ1001' },
      error: null,
    })
    expect(mocks.retrieveByTenantAndUser).toHaveBeenCalledTimes(2)
    expect(mocks.retrieveByTenantAndUser).toHaveBeenNthCalledWith(
      1,
      'ten_rocketship',
      'user_kimani'
    )
    expect(mocks.retrieveByTenantAndUser).toHaveBeenNthCalledWith(
      2,
      'ten_rocketship',
      'user_kimani'
    )
    expect(mocks.allocate).toHaveBeenCalledTimes(1)
    expect(mocks.customerProfileEnsure).toHaveBeenCalledTimes(1)
    expect(mocks.customerProfileEnsure).toHaveBeenCalledWith({
      tenantId: 'ten_rocketship',
      userId: 'user_kimani',
      billingCustomerId: 'blcus_kimani',
      mailboxNumber: 'RSJ1001',
    })
    expect(mocks.listMailboxes).toHaveBeenCalledTimes(1)
    expect(mocks.listMailboxes).toHaveBeenCalledWith({
      tenantId: 'ten_rocketship',
      customerId: 'cprof_kimani',
    })
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })

  it('re-allocates and succeeds when no concurrent profile exists', async () => {
    const params = createParams()
    const profile = createProfile()
    const mailbox = createMailbox({ number: 'RSJ1002' })
    mocks.retrieveByTenantAndUser
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
    mocks.allocate
      .mockResolvedValueOnce({ data: { number: 'RSJ1001' }, error: null })
      .mockResolvedValueOnce({ data: { number: 'RSJ1002' }, error: null })
    mocks.customerProfileEnsure
      .mockRejectedValueOnce({ code: 'P2002' })
      .mockResolvedValueOnce(profile)
    mocks.listMailboxes.mockResolvedValue([mailbox])

    const result = await ensurePortalCustomer(params)

    expect(result).toEqual({
      data: { ...profile, primaryMailboxNumber: 'RSJ1002' },
      error: null,
    })
    expect(mocks.retrieveByTenantAndUser).toHaveBeenCalledTimes(2)
    expect(mocks.allocate).toHaveBeenCalledTimes(2)
    expect(mocks.allocate).toHaveBeenNthCalledWith(1, {
      tenantId: 'ten_rocketship',
    })
    expect(mocks.allocate).toHaveBeenNthCalledWith(2, {
      tenantId: 'ten_rocketship',
    })
    expect(mocks.customerProfileEnsure).toHaveBeenCalledTimes(2)
    expect(mocks.customerProfileEnsure).toHaveBeenNthCalledWith(1, {
      tenantId: 'ten_rocketship',
      userId: 'user_kimani',
      billingCustomerId: 'blcus_kimani',
      mailboxNumber: 'RSJ1001',
    })
    expect(mocks.customerProfileEnsure).toHaveBeenNthCalledWith(2, {
      tenantId: 'ten_rocketship',
      userId: 'user_kimani',
      billingCustomerId: 'blcus_kimani',
      mailboxNumber: 'RSJ1002',
    })
    expect(mocks.listMailboxes).toHaveBeenCalledTimes(1)
    expect(mocks.listMailboxes).toHaveBeenCalledWith({
      tenantId: 'ten_rocketship',
      customerId: 'cprof_kimani',
    })
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })

  it('returns the race winner found after a second P2002 conflict', async () => {
    const params = createParams()
    const profile = createProfile()
    const mailbox = createMailbox({ number: 'RSJ1002' })
    mocks.retrieveByTenantAndUser
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(profile)
    mocks.allocate
      .mockResolvedValueOnce({ data: { number: 'RSJ1001' }, error: null })
      .mockResolvedValueOnce({ data: { number: 'RSJ1002' }, error: null })
    mocks.customerProfileEnsure.mockRejectedValue({ code: 'P2002' })
    mocks.listMailboxes.mockResolvedValue([mailbox])

    const result = await ensurePortalCustomer(params)

    expect(result).toEqual({
      data: { ...profile, primaryMailboxNumber: 'RSJ1002' },
      error: null,
    })
    expect(mocks.retrieveByTenantAndUser).toHaveBeenCalledTimes(3)
    expect(mocks.retrieveByTenantAndUser).toHaveBeenNthCalledWith(
      3,
      'ten_rocketship',
      'user_kimani'
    )
    expect(mocks.allocate).toHaveBeenCalledTimes(2)
    expect(mocks.customerProfileEnsure).toHaveBeenCalledTimes(2)
    expect(mocks.listMailboxes).toHaveBeenCalledTimes(1)
    expect(mocks.listMailboxes).toHaveBeenCalledWith({
      tenantId: 'ten_rocketship',
      customerId: 'cprof_kimani',
    })
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })

  it('returns mailbox unavailable when both P2002 attempts have no race winner', async () => {
    const params = createParams()
    mocks.retrieveByTenantAndUser.mockResolvedValue(null)
    mocks.allocate
      .mockResolvedValueOnce({ data: { number: 'RSJ1001' }, error: null })
      .mockResolvedValueOnce({ data: { number: 'RSJ1002' }, error: null })
    mocks.customerProfileEnsure.mockRejectedValue({ code: 'P2002' })

    const result = await ensurePortalCustomer(params)

    expect(result).toEqual({
      data: null,
      error: 'A mailbox could not be assigned. Please try again.',
      status: 503,
      code: 'portal/mailbox-unavailable',
    })
    expect(mocks.retrieveByTenantAndUser).toHaveBeenCalledTimes(3)
    expect(mocks.allocate).toHaveBeenCalledTimes(2)
    expect(mocks.customerProfileEnsure).toHaveBeenCalledTimes(2)
    expect(mocks.listMailboxes).not.toHaveBeenCalled()
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[portal.ensurePortalCustomer]',
      { code: 'P2002' }
    )
  })

  it('propagates a mailbox failure from the retry allocation', async () => {
    const params = createParams()
    const allocationFailure = {
      data: null,
      error: 'A mailbox number could not be allocated. Please try again.',
      status: 503,
    }
    mocks.retrieveByTenantAndUser.mockResolvedValue(null)
    mocks.allocate
      .mockResolvedValueOnce({ data: { number: 'RSJ1001' }, error: null })
      .mockResolvedValueOnce(allocationFailure)
    mocks.customerProfileEnsure.mockRejectedValueOnce({ code: 'P2002' })

    const result = await ensurePortalCustomer(params)

    expect(result).toEqual(allocationFailure)
    expect(mocks.retrieveByTenantAndUser).toHaveBeenCalledTimes(2)
    expect(mocks.allocate).toHaveBeenCalledTimes(2)
    expect(mocks.customerProfileEnsure).toHaveBeenCalledTimes(1)
    expect(mocks.listMailboxes).not.toHaveBeenCalled()
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })

  it('maps a non-P2002 Error to enrollment failed', async () => {
    const params = createParams()
    const databaseError = new Error('Database connection interrupted')
    mocks.customerProfileEnsure.mockRejectedValue(databaseError)

    const result = await ensurePortalCustomer(params)

    expect(result).toEqual({
      data: null,
      error: 'Portal enrollment could not be completed. Please try again.',
      status: 500,
      code: 'portal/enrollment-failed',
    })
    expect(mocks.retrieveByTenantAndUser).toHaveBeenCalledTimes(1)
    expect(mocks.allocate).toHaveBeenCalledTimes(1)
    expect(mocks.customerProfileEnsure).toHaveBeenCalledTimes(1)
    expect(mocks.listMailboxes).not.toHaveBeenCalled()
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[portal.ensurePortalCustomer]',
      databaseError
    )
  })

  it('maps a non-Error rejection to enrollment failed', async () => {
    const params = createParams()
    const thrownValue = { reason: 'pool exhausted' }
    mocks.customerProfileEnsure.mockRejectedValue(thrownValue)

    const result = await ensurePortalCustomer(params)

    expect(result).toEqual({
      data: null,
      error: 'Portal enrollment could not be completed. Please try again.',
      status: 500,
      code: 'portal/enrollment-failed',
    })
    expect(mocks.retrieveByTenantAndUser).toHaveBeenCalledTimes(1)
    expect(mocks.allocate).toHaveBeenCalledTimes(1)
    expect(mocks.customerProfileEnsure).toHaveBeenCalledTimes(1)
    expect(mocks.listMailboxes).not.toHaveBeenCalled()
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[portal.ensurePortalCustomer]',
      thrownValue
    )
  })

  it('returns mailbox unavailable when an existing profile has no primary mailbox', async () => {
    const params = createParams()
    const profile = createProfile()
    mocks.retrieveByTenantAndUser.mockResolvedValue(profile)
    mocks.listMailboxes.mockResolvedValue([
      createMailbox({ isPrimary: false, number: 'RSJ1002' }),
    ])

    const result = await ensurePortalCustomer(params)

    expect(result).toEqual({
      data: null,
      error: 'A mailbox could not be assigned. Please try again.',
      status: 503,
      code: 'portal/mailbox-unavailable',
    })
    expect(mocks.listMailboxes).toHaveBeenCalledTimes(1)
    expect(mocks.listMailboxes).toHaveBeenCalledWith({
      tenantId: 'ten_rocketship',
      customerId: 'cprof_kimani',
    })
    expect(mocks.getFinanceClient).not.toHaveBeenCalled()
    expect(mocks.ensureSharedCoreUserCustomer).not.toHaveBeenCalled()
    expect(mocks.allocate).not.toHaveBeenCalled()
    expect(mocks.customerProfileEnsure).not.toHaveBeenCalled()
  })

  it('maps a non-P2002 retry failure to enrollment failed', async () => {
    const params = createParams()
    const retryError = new Error('Database connection interrupted')
    mocks.retrieveByTenantAndUser.mockResolvedValue(null)
    mocks.allocate
      .mockResolvedValueOnce({ data: { number: 'RSJ1001' }, error: null })
      .mockResolvedValueOnce({ data: { number: 'RSJ1002' }, error: null })
    mocks.customerProfileEnsure
      .mockRejectedValueOnce({ code: 'P2002' })
      .mockRejectedValueOnce(retryError)

    const result = await ensurePortalCustomer(params)

    expect(result).toEqual({
      data: null,
      error: 'Portal enrollment could not be completed. Please try again.',
      status: 500,
      code: 'portal/enrollment-failed',
    })
    expect(mocks.retrieveByTenantAndUser).toHaveBeenCalledTimes(2)
    expect(mocks.allocate).toHaveBeenCalledTimes(2)
    expect(mocks.customerProfileEnsure).toHaveBeenCalledTimes(2)
    expect(mocks.listMailboxes).not.toHaveBeenCalled()
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[portal.ensurePortalCustomer]',
      retryError
    )
  })
})
