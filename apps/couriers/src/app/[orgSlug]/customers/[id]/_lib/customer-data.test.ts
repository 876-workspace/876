import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getManageContext: vi.fn(),
  getCouriers: vi.fn(),
  couriersRetrieve: vi.fn(),
  couriersBranchesRetrieve: vi.fn(),
  mailboxesList: vi.fn(),
  billingRetrieve: vi.fn(),
}))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))

vi.mock('@/lib/services/couriers', () => ({
  getCouriers: mocks.getCouriers,
  couriersOperator: {
    customers: { mailboxes: { list: mocks.mailboxesList } },
  },
}))
vi.mock('@/lib/services/billing', () => ({
  billingIntegration: {
    customers: { retrieve: mocks.billingRetrieve },
  },
}))

// Mock couriers helpers — keep real logic for helpers but allow spying
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return {
    ...actual,
    cache: <T extends (...args: unknown[]) => unknown>(fn: T): T => fn,
  }
})

vi.mock('@/lib/couriers', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/couriers')>('@/lib/couriers')
  return { ...actual }
})

import { resolveCustomer, resolveCustomerTitle } from './customer-data'

function tenantCtx() {
  return {
    tenant: { id: 'ten_123', orgId: 'org_123' },
  }
}

function rawCustomer(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cprof_123',
    tenant_id: 'ten_123',
    user_id: 'usr_123',
    billing_customer_id: 'cus_123',
    branch_id: 'br_king',
    status: 'ACTIVE',
    trn: '123-456-789',
    is_commercial: true,
    first_seen_at: 1,
    created_at: 1,
    updated_at: 1,
    ...overrides,
  }
}

function billingRegistry(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cus_123',
    name: 'Marlon Brown',
    companyName: 'Brown Trading',
    email: 'marlon@example.com',
    phone: '+18765550142',
    firstName: 'Marlon',
    lastName: 'Brown',
    customerKind: 'INDIVIDUAL',
    customerType: 'CORE_USER',
    ...overrides,
  }
}

describe('resolveCustomer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const request876 = {
      customers: { retrieve: mocks.couriersRetrieve },
      branches: { retrieve: mocks.couriersBranchesRetrieve },
    }
    mocks.getManageContext.mockResolvedValue(tenantCtx())
    mocks.getCouriers.mockResolvedValue(request876)
    mocks.couriersRetrieve.mockResolvedValue({
      data: rawCustomer(),
      error: null,
    })
    mocks.billingRetrieve.mockResolvedValue({
      data: billingRegistry(),
      error: null,
    })
    mocks.mailboxesList.mockResolvedValue({
      data: {
        data: [
          { id: 'mb_1', is_primary: false, number: 'KNG-001' },
          { id: 'mb_2', is_primary: true, number: 'KNG-1042' },
        ],
      },
      error: null,
    })
    mocks.couriersBranchesRetrieve.mockResolvedValue({
      data: { id: 'br_king', name: 'Kingston' },
      error: null,
    })
  })

  it('returns null when manage context has no tenant', async () => {
    mocks.getManageContext.mockResolvedValue({ tenant: null })
    const result = await resolveCustomer('island-logistics', 'cprof_123')
    expect(result).toBeNull()
    expect(mocks.couriersRetrieve).not.toHaveBeenCalled()
  })

  it('returns null when getManageContext returns null', async () => {
    mocks.getManageContext.mockResolvedValue(null)
    expect(await resolveCustomer('org', 'cprof_123')).toBeNull()
  })

  it('returns null when courier customer not found', async () => {
    mocks.couriersRetrieve.mockResolvedValue({
      data: null,
      error: { code: 'couriers/customer/not-found', message: 'not found' },
    })
    expect(await resolveCustomer('island-logistics', 'cprof_999')).toBeNull()
  })

  it('throws when couriers retrieve fails with non-not-found error', async () => {
    mocks.couriersRetrieve.mockResolvedValue({
      data: null,
      error: { code: 'couriers/customer/unavailable', message: 'down' },
    })
    await expect(resolveCustomer('org', 'cprof_123')).rejects.toThrow(
      /Couriers request failed/
    )
  })

  it('resolves profile via toCustomerView and fetches identity, mailboxes, branch', async () => {
    const result = await resolveCustomer('island-logistics', 'cprof_123')
    expect(mocks.couriersRetrieve).toHaveBeenCalledWith('cprof_123')
    expect(mocks.billingRetrieve).toHaveBeenCalledWith('org_123', 'cus_123')
    expect(mocks.mailboxesList).toHaveBeenCalledWith('ten_123', 'cprof_123')
    expect(mocks.couriersBranchesRetrieve).toHaveBeenCalledWith('br_king')
    expect(result?.profile.id).toBe('cprof_123')
    expect(result?.profile.billingCustomerId).toBe('cus_123')
    expect(result?.identity?.name).toBe('Marlon Brown')
  })

  it('selects the primary mailbox when available', async () => {
    const result = await resolveCustomer('org', 'cprof_123')
    expect(result?.mailbox?.number).toBe('KNG-1042')
  })

  it('falls back to first mailbox when no primary exists', async () => {
    mocks.mailboxesList.mockResolvedValue({
      data: {
        data: [
          { id: 'mb_1', is_primary: false, number: 'KNG-001' },
          { id: 'mb_2', is_primary: false, number: 'KNG-002' },
        ],
      },
      error: null,
    })
    const result = await resolveCustomer('org', 'cprof_123')
    expect(result?.mailbox?.number).toBe('KNG-001')
  })

  it('returns undefined mailbox when list is empty', async () => {
    mocks.mailboxesList.mockResolvedValue({ data: { data: [] }, error: null })
    const result = await resolveCustomer('org', 'cprof_123')
    expect(result?.mailbox).toBeUndefined()
  })

  it('returns null branch when branchId is null', async () => {
    mocks.couriersRetrieve.mockResolvedValue({
      data: rawCustomer({ branch_id: null }),
      error: null,
    })
    const result = await resolveCustomer('org', 'cprof_123')
    expect(result?.branch).toBeNull()
    expect(mocks.couriersBranchesRetrieve).not.toHaveBeenCalled()
  })

  it('returns null branch when branch retrieve returns error', async () => {
    mocks.couriersBranchesRetrieve.mockResolvedValue({
      data: null,
      error: { code: 'couriers/branch/not-found', message: 'no' },
    })
    const result = await resolveCustomer('org', 'cprof_123')
    expect(result?.branch).toBeNull()
  })

  it('passes correct orgSlug to getManageContext and requestId path', async () => {
    await resolveCustomer('nkr-express', 'cprof_123')
    expect(mocks.getManageContext).toHaveBeenCalledWith('nkr-express')
    expect(mocks.getCouriers).toHaveBeenCalledTimes(1)
  })
})

describe('resolveCustomerTitle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const request876 = {
      customers: { retrieve: mocks.couriersRetrieve },
    }
    mocks.getManageContext.mockResolvedValue(tenantCtx())
    mocks.getCouriers.mockResolvedValue(request876)
    mocks.couriersRetrieve.mockResolvedValue({
      data: rawCustomer(),
      error: null,
    })
    mocks.billingRetrieve.mockResolvedValue({
      data: billingRegistry(),
      error: null,
    })
  })

  it('returns null when no tenant', async () => {
    mocks.getManageContext.mockResolvedValue({ tenant: null })
    expect(await resolveCustomerTitle('org', 'cprof_123')).toBeNull()
  })

  it('returns null when customer not found', async () => {
    mocks.couriersRetrieve.mockResolvedValue({
      data: null,
      error: { code: 'couriers/customer/not-found', message: 'nf' },
    })
    expect(await resolveCustomerTitle('org', 'cprof_123')).toBeNull()
  })

  it('returns registry name when available', async () => {
    expect(await resolveCustomerTitle('org', 'cprof_123')).toBe('Marlon Brown')
  })

  it('falls back to billingCustomerId when registry name missing', async () => {
    mocks.billingRetrieve.mockResolvedValue({
      data: { ...billingRegistry(), name: null },
      error: null,
    })
    expect(await resolveCustomerTitle('org', 'cprof_123')).toBe('cus_123')
  })

  it('falls back to billingCustomerId when registry data is null', async () => {
    mocks.billingRetrieve.mockResolvedValue({ data: null, error: null })
    expect(await resolveCustomerTitle('org', 'cprof_123')).toBe('cus_123')
  })

  it('avoids mailboxes and branch fetches (lightweight title path)', async () => {
    await resolveCustomerTitle('org', 'cprof_123')
    expect(mocks.mailboxesList).not.toHaveBeenCalled()
    expect(mocks.couriersBranchesRetrieve).not.toHaveBeenCalled()
  })
})
