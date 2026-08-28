import { beforeEach, describe, expect, it, vi } from 'vitest'

const { tenants, repository, finance } = vi.hoisted(() => ({
  tenants: { retrieveByOrganization: vi.fn() },
  repository: { create: vi.fn(), ensureMany: vi.fn(), retrieve: vi.fn() },
  finance: { create: vi.fn(), list: vi.fn() },
}))

vi.mock('../../tenants/tenants.service.js', () => tenants)
vi.mock('../customers.repository.js', () => repository)
vi.mock('@876/billing/integration', () => ({
  create876BillingIntegrationClient: () => ({ customers: finance }),
}))

const { createCustomerBodySchema, listCustomersQuerySchema } =
  await import('../customers.schemas.js')

const tenant = { id: 'crm_tenant_1', organizationId: 'org_1', status: 'ACTIVE' }

function body(overrides: Record<string, unknown> = {}) {
  return {
    idempotencyKey: 'idem_1',
    customerKind: 'INDIVIDUAL',
    firstName: 'Alejandra',
    lastName: 'Reyes',
    ...overrides,
  }
}

describe('createCustomerBodySchema - the identity link', () => {
  it('accepts a customer with no link at all', () => {
    const result = createCustomerBodySchema.safeParse(body())

    expect(result.success).toBe(true)
  })

  it('accepts an 876 account as an INDIVIDUAL customer', () => {
    const result = createCustomerBodySchema.safeParse(
      body({ userId: 'user_2kL9mN4q' })
    )

    expect(result.success).toBe(true)
  })

  it('accepts an 876 organization as a BUSINESS customer', () => {
    const result = createCustomerBodySchema.safeParse(
      body({
        customerKind: 'BUSINESS',
        companyName: 'Efesto Technologies',
        firstName: null,
        lastName: null,
        organizationId: 'org_7fA2',
      })
    )

    expect(result.success).toBe(true)
  })

  it('rejects an 876 account declared as a BUSINESS customer', () => {
    const result = createCustomerBodySchema.safeParse(
      body({
        customerKind: 'BUSINESS',
        companyName: 'Efesto Technologies',
        userId: 'user_2kL9mN4q',
      })
    )

    expect(result.success).toBe(false)
    expect(result.error?.issues.some((i) => i.path.includes('userId'))).toBe(
      true
    )
  })

  it('rejects an 876 organization declared as an INDIVIDUAL customer', () => {
    const result = createCustomerBodySchema.safeParse(
      body({ organizationId: 'org_7fA2' })
    )

    expect(result.success).toBe(false)
    expect(
      result.error?.issues.some((i) => i.path.includes('organizationId'))
    ).toBe(true)
  })

  it('rejects a customer linked to both an account and an organization', () => {
    const result = createCustomerBodySchema.safeParse(
      body({ userId: 'user_2kL9mN4q', organizationId: 'org_7fA2' })
    )

    expect(result.success).toBe(false)
    expect(
      result.error?.issues.some(
        (i) =>
          i.message ===
          'A customer links to an account or an organization, not both.'
      )
    ).toBe(true)
  })
})

describe('customers.create - deriving the customer type', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    tenants.retrieveByOrganization.mockResolvedValue(tenant)
    finance.create.mockResolvedValue({
      data: {
        id: 'cus_1',
        customerType: 'EXTERNAL',
        customerKind: 'INDIVIDUAL',
      },
      error: null,
    })
    repository.create.mockResolvedValue({
      id: 'crm_cus_1',
      tenantId: tenant.id,
      billingCustomerId: 'cus_1',
      ownerId: null,
      status: 'ACTIVE',
      createdAt: new Date('2026-08-28T00:00:00.000Z'),
      updatedAt: new Date('2026-08-28T00:00:00.000Z'),
      deletedAt: null,
      deletedBy: null,
      deletionReason: null,
    })
  })

  async function create(input: Record<string, unknown>) {
    const service = await import('../customers.service.js')
    return service.create('org_1', {
      idempotencyKey: 'idem_1',
      customerKind: 'INDIVIDUAL',
      firstName: 'Alejandra',
      lastName: 'Reyes',
      ...input,
    } as never)
  }

  it('registers an unlinked customer as EXTERNAL', async () => {
    await create({})

    expect(finance.create).toHaveBeenCalledTimes(1)
    expect(finance.create.mock.calls[0][1]).toMatchObject({
      customerType: 'EXTERNAL',
      userId: null,
      organizationId: null,
    })
  })

  it('registers a linked account as CORE_USER carrying its opaque id', async () => {
    await create({ userId: 'user_2kL9mN4q' })

    expect(finance.create.mock.calls[0][1]).toMatchObject({
      customerType: 'CORE_USER',
      userId: 'user_2kL9mN4q',
      organizationId: null,
    })
  })

  it('registers a linked organization as CORE_ORGANIZATION', async () => {
    await create({
      customerKind: 'BUSINESS',
      companyName: 'Efesto Technologies',
      organizationId: 'org_7fA2',
    })

    expect(finance.create.mock.calls[0][1]).toMatchObject({
      customerType: 'CORE_ORGANIZATION',
      organizationId: 'org_7fA2',
      userId: null,
    })
  })
})

describe('customers.list - resolving a party to a customer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    tenants.retrieveByOrganization.mockResolvedValue(tenant)
    finance.list.mockResolvedValue({
      data: { data: [], has_more: false },
      error: null,
    })
    repository.ensureMany.mockResolvedValue(new Map())
  })

  async function list(filter?: Record<string, unknown>) {
    const service = await import('../customers.service.js')
    return service.list('org_1', filter as never)
  }

  it('asks the registry for every customer when no party is named', async () => {
    await list()

    expect(finance.list).toHaveBeenCalledWith('org_1', { limit: 100 })
  })

  it('narrows to the customer linked to an 876 organization', async () => {
    await list({ customerOrganizationId: 'org_7fA2' })

    expect(finance.list).toHaveBeenCalledWith('org_1', {
      limit: 100,
      organizationId: 'org_7fA2',
    })
  })

  it('narrows to the customer linked to an 876 account', async () => {
    await list({ customerUserId: 'user_2kL9mN4q' })

    expect(finance.list).toHaveBeenCalledWith('org_1', {
      limit: 100,
      userId: 'user_2kL9mN4q',
    })
  })

  // The route's own organizationId is the tenant being read; the filter names a
  // different organization entirely. Conflating them would silently return the
  // tenant's own customer record instead of the one asked for.
  it('does not confuse the tenant with the party being resolved', async () => {
    await list({ customerOrganizationId: 'org_7fA2' })

    const [tenantOrgId, params] = finance.list.mock.calls[0]
    expect(tenantOrgId).toBe('org_1')
    expect(params.organizationId).toBe('org_7fA2')
  })
})

describe('listCustomersQuerySchema', () => {
  it('accepts an empty query', () => {
    expect(listCustomersQuerySchema.safeParse({}).success).toBe(true)
  })

  it('rejects a party id longer than the column allows', () => {
    const result = listCustomersQuerySchema.safeParse({
      customerOrganizationId: 'o'.repeat(161),
    })

    expect(result.success).toBe(false)
  })
})
