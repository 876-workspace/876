import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { resetSettingsForTest } from '@/config'

const mocks = vi.hoisted(() => ({
  resolveEnsureTenant: vi.fn(),
  findCoreCustomer: vi.fn(),
  ensureCoreCustomerRows: vi.fn(),
}))

vi.mock('@/modules/customers/customers.repository', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  resolveEnsureTenant: mocks.resolveEnsureTenant,
  findCoreCustomer: mocks.findCoreCustomer,
  ensureCoreCustomerRows: mocks.ensureCoreCustomerRows,
}))

import { ensureCoreCustomer } from '../customers.service'
import {
  customerEnsureBodySchema,
  type CustomerEnsureBody,
} from '../customers.schemas'

const PLATFORM_TENANT = {
  id: 'btenant_platform',
  organizationId: 'org_efesto',
  defaultCurrency: 'JMD',
  defaultLanguage: 'en',
}

function orgEnsureBody(
  overrides: Partial<CustomerEnsureBody> = {}
): CustomerEnsureBody {
  return {
    customerType: 'CORE_ORGANIZATION',
    customerKind: 'BUSINESS',
    organizationId: 'org_customer',
    status: 'ACTIVE',
    name: 'Acme Couriers',
    email: 'ops@acme.example',
    ...overrides,
  } as CustomerEnsureBody
}

beforeEach(() => {
  vi.stubEnv('BILLING_PLATFORM_TENANT_SLUG', '876')
  resetSettingsForTest()
  vi.clearAllMocks()
  mocks.resolveEnsureTenant.mockResolvedValue(PLATFORM_TENANT)
  mocks.findCoreCustomer.mockResolvedValue(null)
  mocks.ensureCoreCustomerRows.mockResolvedValue({ id: 'cust_new' })
})

afterEach(() => {
  vi.unstubAllEnvs()
  resetSettingsForTest()
})

describe('customer.ensure contract', () => {
  it('accepts the generic primary contact phone emitted by Core', () => {
    const parsed = customerEnsureBodySchema.parse({
      customerType: 'CORE_ORGANIZATION',
      organizationId: 'org_customer',
      name: 'Acme Couriers',
      primaryContact: {
        userId: 'user_owner',
        email: 'super-admin@acme.example',
        phone: '+18765550123',
      },
    })

    expect(parsed.primaryContact).toMatchObject({
      userId: 'user_owner',
      email: 'super-admin@acme.example',
      phone: '+18765550123',
    })
  })
})

describe('Billing platform tenant configuration', () => {
  it('defaults an omitted or blank platform tenant slug to efesto', () => {
    const omitted = { ...process.env }
    delete omitted.BILLING_PLATFORM_TENANT_SLUG

    expect(resetSettingsForTest(omitted).platformTenantSlug).toBe('efesto')
    expect(
      resetSettingsForTest({
        ...omitted,
        BILLING_PLATFORM_TENANT_SLUG: '   ',
      }).platformTenantSlug
    ).toBe('efesto')
  })
})

describe('ensureCoreCustomer — operator self-customer guard', () => {
  it('skips the org that owns the workspace and never writes a customer row', async () => {
    const result = await ensureCoreCustomer(
      orgEnsureBody({ organizationId: PLATFORM_TENANT.organizationId })
    )

    expect(result).toEqual({
      object: 'acknowledgement',
      id: null,
      created: false,
    })
    expect(mocks.ensureCoreCustomerRows).not.toHaveBeenCalled()
    expect(mocks.findCoreCustomer).not.toHaveBeenCalled()
  })

  it('creates a customer for a different org in the same workspace', async () => {
    const result = await ensureCoreCustomer(
      orgEnsureBody({ organizationId: 'org_customer' })
    )

    expect(result).toEqual({ object: 'customer', id: 'cust_new' })
    expect(mocks.ensureCoreCustomerRows).toHaveBeenCalledTimes(1)
  })

  it('does not skip when the workspace has no owning org', async () => {
    mocks.resolveEnsureTenant.mockResolvedValue({
      ...PLATFORM_TENANT,
      organizationId: null,
    })

    const result = await ensureCoreCustomer(
      orgEnsureBody({ organizationId: 'org_customer' })
    )

    expect(result).toEqual({ object: 'customer', id: 'cust_new' })
    expect(mocks.ensureCoreCustomerRows).toHaveBeenCalledTimes(1)
  })
})
