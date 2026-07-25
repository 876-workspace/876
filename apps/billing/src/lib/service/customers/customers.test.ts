import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CustomerEnsureSchema } from '@/types/sync'

import { create } from './create'
import { deleteCustomer } from './delete'
import { ensure } from './ensure'
import { update } from './update'

const mocks = vi.hoisted(() => ({
  prismaRef: { current: null as unknown as Record<string, unknown> },
  hasEnabledCurrency: vi.fn(),
  generateId: vi.fn(),
  nowUnixSeconds: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  get prisma() {
    return mocks.prismaRef.current
  },
}))
vi.mock('@/lib/id', () => ({ generateId: mocks.generateId }))
vi.mock('@876/core/timestamps', () => ({
  nowUnixSeconds: mocks.nowUnixSeconds,
}))
vi.mock('../shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../shared')>()
  return { ...actual, hasEnabledCurrency: mocks.hasEnabledCurrency }
})

function prismaCustomer() {
  return mocks.prismaRef.current as unknown as {
    customer: {
      create: ReturnType<typeof vi.fn>
      delete: ReturnType<typeof vi.fn>
      findFirst: ReturnType<typeof vi.fn>
      update: ReturnType<typeof vi.fn>
      updateMany: ReturnType<typeof vi.fn>
    }
    contact: {
      findFirst: ReturnType<typeof vi.fn>
      update: ReturnType<typeof vi.fn>
      updateMany: ReturnType<typeof vi.fn>
      create: ReturnType<typeof vi.fn>
    }
  }
}

function createParams(overrides: Record<string, unknown> = {}) {
  return {
    customerType: 'EXTERNAL',
    customerKind: 'INDIVIDUAL',
    name: 'Efesto Technologies',
    ...overrides,
  } as never
}

const attribution = {
  sourceAppId: 'rap_couriers',
  sourceExternalReference: 'customer_876',
  sourceIdempotencyKey: 'customer-create-1',
  sourcePayloadHash: 'payload_hash_1',
}

describe('customer mutations', () => {
  beforeEach(() => {
    mocks.prismaRef.current = {
      tenant: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ defaultCurrency: 'JMD', defaultLanguage: 'en' }),
      },
      customer: {
        create: vi.fn().mockResolvedValue({ id: 'cus_123' }),
        delete: vi.fn().mockResolvedValue({ id: 'cus_123' }),
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockResolvedValue({ id: 'cus_123' }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      contact: {
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockResolvedValue({ id: 'con_123' }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        create: vi.fn().mockResolvedValue({ id: 'con_123' }),
      },
    }
    mocks.hasEnabledCurrency.mockResolvedValue(true)
    mocks.generateId.mockReturnValue('cus_123')
    mocks.nowUnixSeconds.mockReturnValue(1_783_771_200)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates a customer with normalized optional fields', async () => {
    const customer = (
      mocks.prismaRef.current as unknown as {
        customer: { create: ReturnType<typeof vi.fn> }
      }
    ).customer

    const result = await create('ten_123', createParams())

    expect(result).toEqual({ data: { id: 'cus_123' }, error: null })
    // Currency and language inherit the workspace defaults when unspecified.
    expect(mocks.hasEnabledCurrency).toHaveBeenCalledWith('ten_123', 'JMD')
    expect(mocks.generateId).toHaveBeenCalledTimes(1)
    expect(mocks.generateId).toHaveBeenCalledWith('Customer')
    expect(customer.create).toHaveBeenCalledTimes(1)
    expect(customer.create).toHaveBeenCalledWith({
      data: {
        id: 'cus_123',
        tenantId: 'ten_123',
        customerType: 'EXTERNAL',
        customerKind: 'INDIVIDUAL',
        organizationId: null,
        userId: null,
        externalReference: null,
        name: 'Efesto Technologies',
        salutation: null,
        firstName: null,
        lastName: null,
        companyName: null,
        email: null,
        phone: null,
        workPhone: null,
        defaultCurrency: 'JMD',
        language: 'en',
        paymentTermId: null,
        salespersonId: null,
        taxBehaviorOverride: null,
        lateFeeExempt: false,
        invoiceNotes: null,
        invoiceTerms: null,
        coreSyncedAt: null,
        status: 'ACTIVE',
        createdAt: 1_783_771_200,
        updatedAt: 1_783_771_200,
      },
    })
  })

  it('persists product-app attribution on a new customer', async () => {
    const customer = (
      mocks.prismaRef.current as unknown as {
        customer: {
          create: ReturnType<typeof vi.fn>
          findFirst: ReturnType<typeof vi.fn>
        }
      }
    ).customer

    const result = await create('ten_123', createParams(), attribution)

    expect(result).toEqual({ data: { id: 'cus_123' }, error: null })
    expect(customer.findFirst).toHaveBeenCalledWith({
      where: {
        tenantId: 'ten_123',
        sourceAppId: 'rap_couriers',
        sourceIdempotencyKey: 'customer-create-1',
      },
      select: { id: true, sourcePayloadHash: true },
    })
    expect(customer.create).toHaveBeenCalledWith({
      data: expect.objectContaining(attribution),
    })
  })

  it('replays identical product-app creates before running validations', async () => {
    const customer = (
      mocks.prismaRef.current as unknown as {
        customer: {
          create: ReturnType<typeof vi.fn>
          findFirst: ReturnType<typeof vi.fn>
        }
      }
    ).customer
    customer.findFirst.mockResolvedValue({
      id: 'cus_existing',
      sourcePayloadHash: 'payload_hash_1',
    })

    const result = await create('ten_123', createParams(), attribution)

    expect(result).toEqual({
      data: { id: 'cus_existing', replayed: true },
      error: null,
    })
    expect(customer.create).not.toHaveBeenCalled()
    expect(mocks.hasEnabledCurrency).not.toHaveBeenCalled()
  })

  it('creates a core-linked customer with explicit contact and currency', async () => {
    const customer = (
      mocks.prismaRef.current as unknown as {
        customer: { create: ReturnType<typeof vi.fn> }
      }
    ).customer
    const params = createParams({
      customerType: 'CORE_ORGANIZATION',
      organizationId: 'org_123',
      userId: 'user_123',
      externalReference: 'external_123',
      email: 'billing@example.com',
      phone: '+18765550123',
      currency: 'JMD',
    })

    const result = await create('ten_123', params)

    expect(result.error).toBeNull()
    expect(mocks.hasEnabledCurrency).toHaveBeenCalledTimes(1)
    expect(mocks.hasEnabledCurrency).toHaveBeenCalledWith('ten_123', 'JMD')
    expect(customer.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'org_123',
        userId: 'user_123',
        externalReference: 'external_123',
        email: 'billing@example.com',
        phone: '+18765550123',
        defaultCurrency: 'JMD',
      }),
    })
  })

  it('rejects a customer currency that is not enabled', async () => {
    const customer = (
      mocks.prismaRef.current as unknown as {
        customer: { create: ReturnType<typeof vi.fn> }
      }
    ).customer
    mocks.hasEnabledCurrency.mockResolvedValue(false)

    const result = await create('ten_123', createParams({ currency: 'USD' }))

    expect(result).toEqual({
      data: null,
      error: 'Enable the customer currency before using it.',
      status: 422,
    })
    expect(customer.create).not.toHaveBeenCalled()
  })

  it('maps duplicate references to conflict', async () => {
    const customer = (
      mocks.prismaRef.current as unknown as {
        customer: { create: ReturnType<typeof vi.fn> }
      }
    ).customer
    customer.create.mockRejectedValue({ code: 'P2002' })

    const result = await create('ten_123', createParams())

    expect(result).toEqual({
      data: null,
      error: 'This core reference or external reference is already a customer.',
      status: 409,
    })
    expect(console.error).not.toHaveBeenCalled()
  })

  it('returns a safe 500 for an unexpected create failure', async () => {
    const customer = (
      mocks.prismaRef.current as unknown as {
        customer: { create: ReturnType<typeof vi.fn> }
      }
    ).customer
    const error = new Error('database unavailable')
    customer.create.mockRejectedValue(error)

    const result = await create('ten_123', createParams())

    expect(result).toEqual({
      data: null,
      error: 'Failed to create the customer.',
      status: 500,
    })
    expect(console.error).toHaveBeenCalledTimes(1)
    expect(console.error).toHaveBeenCalledWith(
      '[billing.service.customers.create]',
      error
    )
  })

  it('rejects an empty customer update', async () => {
    const customer = (
      mocks.prismaRef.current as unknown as {
        customer: { updateMany: ReturnType<typeof vi.fn> }
      }
    ).customer

    const result = await update('ten_123', 'cus_123', {})

    expect(result).toEqual({
      data: null,
      error: 'Nothing to update.',
      status: 422,
    })
    expect(customer.updateMany).not.toHaveBeenCalled()
  })

  it('rejects an unavailable update currency', async () => {
    const customer = (
      mocks.prismaRef.current as unknown as {
        customer: { updateMany: ReturnType<typeof vi.fn> }
      }
    ).customer
    mocks.hasEnabledCurrency.mockResolvedValue(false)

    const result = await update('ten_123', 'cus_123', { currency: 'USD' })

    expect(result).toEqual({
      data: null,
      error: 'Enable the customer currency before using it.',
      status: 422,
    })
    expect(customer.updateMany).not.toHaveBeenCalled()
  })

  it('updates every supplied customer field', async () => {
    const customer = (
      mocks.prismaRef.current as unknown as {
        customer: { updateMany: ReturnType<typeof vi.fn> }
      }
    ).customer
    const params = {
      name: 'Efesto Group',
      email: null,
      phone: '+18765550124',
      currency: null,
      status: 'ARCHIVED' as const,
    }

    const result = await update('ten_123', 'cus_123', params)

    expect(result).toEqual({ data: { id: 'cus_123' }, error: null })
    expect(mocks.hasEnabledCurrency).not.toHaveBeenCalled()
    expect(customer.updateMany).toHaveBeenCalledTimes(1)
    expect(customer.updateMany).toHaveBeenCalledWith({
      where: { id: 'cus_123', tenantId: 'ten_123' },
      data: {
        updatedAt: 1_783_771_200,
        name: 'Efesto Group',
        email: null,
        phone: '+18765550124',
        defaultCurrency: null,
        status: 'ARCHIVED',
      },
    })
  })

  it('returns 404 when no customer matches an update', async () => {
    const customer = (
      mocks.prismaRef.current as unknown as {
        customer: { updateMany: ReturnType<typeof vi.fn> }
      }
    ).customer
    customer.updateMany.mockResolvedValue({ count: 0 })

    const result = await update('ten_123', 'cus_missing', { name: 'Missing' })

    expect(result).toEqual({
      data: null,
      error: 'Customer not found.',
      status: 404,
    })
  })

  it('returns a safe 500 for an unexpected update failure', async () => {
    const customer = (
      mocks.prismaRef.current as unknown as {
        customer: { updateMany: ReturnType<typeof vi.fn> }
      }
    ).customer
    customer.updateMany.mockRejectedValue(new Error('database unavailable'))

    const result = await update('ten_123', 'cus_123', { name: 'Updated' })

    expect(result).toEqual({
      data: null,
      error: 'Failed to update the customer.',
      status: 500,
    })
    expect(console.error).toHaveBeenCalledTimes(1)
  })

  it('returns 404 when deleting a missing customer', async () => {
    const customer = (
      mocks.prismaRef.current as unknown as {
        customer: { delete: ReturnType<typeof vi.fn> }
      }
    ).customer

    const result = await deleteCustomer('ten_123', 'cus_missing')

    expect(result).toEqual({
      data: null,
      error: 'Customer not found.',
      status: 404,
    })
    expect(customer.delete).not.toHaveBeenCalled()
  })

  it.each([
    { invoices: 1, quotes: 0, subscriptions: 0 },
    { invoices: 0, quotes: 1, subscriptions: 0 },
    { invoices: 0, quotes: 0, subscriptions: 1 },
  ])('protects a referenced customer with counts %j', async (counts) => {
    const customer = (
      mocks.prismaRef.current as unknown as {
        customer: {
          findFirst: ReturnType<typeof vi.fn>
          delete: ReturnType<typeof vi.fn>
        }
      }
    ).customer
    customer.findFirst.mockResolvedValue({ _count: counts })

    const result = await deleteCustomer('ten_123', 'cus_123')

    expect(result).toEqual({
      data: null,
      error:
        'This customer has quotes, invoices, or subscriptions. Archive the customer instead.',
      status: 409,
    })
    expect(customer.delete).not.toHaveBeenCalled()
  })

  it('deletes an unreferenced customer', async () => {
    const customer = (
      mocks.prismaRef.current as unknown as {
        customer: {
          findFirst: ReturnType<typeof vi.fn>
          delete: ReturnType<typeof vi.fn>
        }
      }
    ).customer
    customer.findFirst.mockResolvedValue({
      _count: { invoices: 0, quotes: 0, subscriptions: 0 },
    })

    const result = await deleteCustomer('ten_123', 'cus_123')

    expect(result).toEqual({ data: { id: 'cus_123' }, error: null })
    expect(customer.delete).toHaveBeenCalledTimes(1)
    expect(customer.delete).toHaveBeenCalledWith({ where: { id: 'cus_123' } })
  })

  it('returns a safe 500 when deletion throws', async () => {
    const customer = (
      mocks.prismaRef.current as unknown as {
        customer: { findFirst: ReturnType<typeof vi.fn> }
      }
    ).customer
    customer.findFirst.mockRejectedValue(new Error('database unavailable'))

    const result = await deleteCustomer('ten_123', 'cus_123')

    expect(result).toEqual({
      data: null,
      error: 'Failed to delete the customer.',
      status: 500,
    })
    expect(console.error).toHaveBeenCalledTimes(1)
  })

  it('reconciles an existing mirrored customer', async () => {
    const customer = (
      mocks.prismaRef.current as unknown as {
        customer: {
          create: ReturnType<typeof vi.fn>
          findFirst: ReturnType<typeof vi.fn>
          update: ReturnType<typeof vi.fn>
        }
      }
    ).customer
    customer.findFirst.mockResolvedValue({ id: 'cus_existing' })

    const result = await ensure('ten_123', {
      customerType: 'CORE_ORGANIZATION',
      organizationId: 'org_123',
      name: 'Efesto Technologies',
      email: undefined,
    })

    expect(result).toEqual({ data: { id: 'cus_existing' }, error: null })
    expect(customer.findFirst).toHaveBeenCalledWith({
      where: { tenantId: 'ten_123', organizationId: 'org_123' },
      select: { id: true },
    })
    expect(customer.update).toHaveBeenCalledTimes(1)
    expect(customer.update).toHaveBeenCalledWith({
      where: { id: 'cus_existing' },
      data: {
        name: 'Efesto Technologies',
        email: null,
        companyName: null,
        firstName: null,
        lastName: null,
        phone: null,
        customerKind: 'BUSINESS',
        coreSyncedAt: 1_783_771_200,
        updatedAt: 1_783_771_200,
      },
    })
    expect(customer.create).not.toHaveBeenCalled()
  })

  it('creates a missing mirrored organization customer', async () => {
    const customer = (
      mocks.prismaRef.current as unknown as {
        customer: { create: ReturnType<typeof vi.fn> }
      }
    ).customer

    const result = await ensure('ten_123', {
      customerType: 'CORE_ORGANIZATION',
      organizationId: 'org_123',
      name: 'Efesto Technologies',
      email: 'billing@example.com',
    })

    expect(result).toEqual({ data: { id: 'cus_123' }, error: null })
    expect(customer.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'ten_123',
        customerType: 'CORE_ORGANIZATION',
        customerKind: 'BUSINESS',
        organizationId: 'org_123',
        userId: null,
        name: 'Efesto Technologies',
        email: 'billing@example.com',
      }),
    })
  })

  it('creates a missing mirrored user customer', async () => {
    const customer = (
      mocks.prismaRef.current as unknown as {
        customer: {
          create: ReturnType<typeof vi.fn>
          findFirst: ReturnType<typeof vi.fn>
        }
      }
    ).customer

    const result = await ensure('ten_123', {
      customerType: 'CORE_USER',
      userId: 'usr_123',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
    })

    expect(result).toEqual({ data: { id: 'cus_123' }, error: null })
    expect(customer.findFirst).toHaveBeenCalledWith({
      where: { tenantId: 'ten_123', userId: 'usr_123' },
      select: { id: true },
    })
    expect(customer.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'ten_123',
        customerType: 'CORE_USER',
        customerKind: 'INDIVIDUAL',
        organizationId: null,
        userId: 'usr_123',
        name: 'Ada Lovelace',
        email: 'ada@example.com',
      }),
    })
  })

  it('reconciles an existing mirrored user customer', async () => {
    const customer = (
      mocks.prismaRef.current as unknown as {
        customer: {
          create: ReturnType<typeof vi.fn>
          findFirst: ReturnType<typeof vi.fn>
          update: ReturnType<typeof vi.fn>
        }
      }
    ).customer
    customer.findFirst.mockResolvedValue({ id: 'cus_user' })

    const result = await ensure('ten_123', {
      customerType: 'CORE_USER',
      userId: 'usr_123',
      name: 'Ada Byron',
      email: null,
    })

    expect(result).toEqual({ data: { id: 'cus_user' }, error: null })
    expect(customer.findFirst).toHaveBeenCalledWith({
      where: { tenantId: 'ten_123', userId: 'usr_123' },
      select: { id: true },
    })
    expect(customer.update).toHaveBeenCalledWith({
      where: { id: 'cus_user' },
      data: {
        name: 'Ada Byron',
        email: null,
        companyName: null,
        firstName: null,
        lastName: null,
        phone: null,
        customerKind: 'INDIVIDUAL',
        coreSyncedAt: 1_783_771_200,
        updatedAt: 1_783_771_200,
      },
    })
    expect(customer.create).not.toHaveBeenCalled()
  })

  it('returns the race winner after a duplicate mirrored customer create', async () => {
    const customer = (
      mocks.prismaRef.current as unknown as {
        customer: {
          findFirst: ReturnType<typeof vi.fn>
          create: ReturnType<typeof vi.fn>
        }
      }
    ).customer
    customer.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'cus_winner' })
    customer.create.mockRejectedValue({ code: 'P2002' })

    const result = await ensure('ten_123', {
      customerType: 'CORE_ORGANIZATION',
      organizationId: 'org_123',
      name: 'Efesto Technologies',
    })

    expect(result).toEqual({ data: { id: 'cus_winner' }, error: null })
    expect(customer.findFirst).toHaveBeenNthCalledWith(2, {
      where: { tenantId: 'ten_123', organizationId: 'org_123' },
      select: { id: true },
    })
  })

  it('returns the original conflict when no race winner exists', async () => {
    const customer = (
      mocks.prismaRef.current as unknown as {
        customer: {
          findFirst: ReturnType<typeof vi.fn>
          create: ReturnType<typeof vi.fn>
        }
      }
    ).customer
    customer.findFirst.mockResolvedValue(null)
    customer.create.mockRejectedValue({ code: 'P2002' })

    const result = await ensure('ten_123', {
      customerType: 'CORE_ORGANIZATION',
      organizationId: 'org_123',
      name: 'Efesto Technologies',
    })

    expect(result).toEqual({
      data: null,
      error: 'This core reference or external reference is already a customer.',
      status: 409,
    })
  })

  it.each([
    {
      customerType: 'CORE_ORGANIZATION',
      organizationId: 'org_123',
      userId: 'usr_123',
      name: 'Invalid',
    },
    { customerType: 'CORE_USER', name: 'Invalid' },
    {
      customerType: 'CORE_ORGANIZATION',
      userId: 'usr_123',
      name: 'Invalid',
    },
  ])('rejects an invalid mirrored customer identity: %j', (payload) => {
    const result = CustomerEnsureSchema.safeParse(payload)

    expect(result.success).toBe(false)
  })

  it('persists the full party snapshot when ensuring an organization', async () => {
    const { customer } = prismaCustomer()

    const result = await ensure('ten_123', {
      customerType: 'CORE_ORGANIZATION',
      organizationId: 'org_123',
      customerKind: 'BUSINESS',
      name: 'Efesto',
      companyName: 'Efesto Technologies',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ap@efesto.test',
      phone: '+18765550000',
    })

    expect(result).toEqual({ data: { id: 'cus_123' }, error: null })
    expect(customer.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        customerType: 'CORE_ORGANIZATION',
        customerKind: 'BUSINESS',
        organizationId: 'org_123',
        userId: null,
        name: 'Efesto',
        companyName: 'Efesto Technologies',
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ap@efesto.test',
        phone: '+18765550000',
      }),
    })
  })

  it('seeds a primary contact when ensuring a new organization customer', async () => {
    const { customer, contact } = prismaCustomer()
    mocks.generateId
      .mockReturnValueOnce('cus_123')
      .mockReturnValueOnce('con_123')

    const result = await ensure('ten_123', {
      customerType: 'CORE_ORGANIZATION',
      organizationId: 'org_123',
      name: 'Efesto Technologies',
      primaryContact: {
        userId: 'usr_owner',
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        phone: '+18765550111',
      },
    })

    expect(result.error).toBeNull()
    expect(customer.create).toHaveBeenCalledTimes(1)
    expect(contact.findFirst).toHaveBeenCalledWith({
      where: {
        tenantId: 'ten_123',
        customerId: 'cus_123',
        userId: 'usr_owner',
      },
      select: { id: true },
    })
    expect(contact.updateMany).toHaveBeenCalledWith({
      where: { tenantId: 'ten_123', customerId: 'cus_123', isPrimary: true },
      data: { isPrimary: false, updatedAt: 1_783_771_200 },
    })
    expect(contact.create).toHaveBeenCalledWith({
      data: {
        id: 'con_123',
        tenantId: 'ten_123',
        customerId: 'cus_123',
        userId: 'usr_owner',
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        mobilePhone: '+18765550111',
        isPrimary: true,
        coreSyncedAt: 1_783_771_200,
        createdAt: 1_783_771_200,
        updatedAt: 1_783_771_200,
      },
    })
  })

  it('refreshes an existing primary contact on re-ensure', async () => {
    const { customer, contact } = prismaCustomer()
    customer.findFirst.mockResolvedValue({ id: 'cus_existing' })
    contact.findFirst.mockResolvedValue({ id: 'con_existing' })

    const result = await ensure('ten_123', {
      customerType: 'CORE_ORGANIZATION',
      organizationId: 'org_123',
      name: 'Efesto',
      companyName: 'Efesto Technologies',
      firstName: 'Ada',
      lastName: 'Byron',
      primaryContact: {
        userId: 'usr_owner',
        firstName: 'Ada',
        lastName: 'Byron',
        email: 'ada@byron.test',
      },
    })

    expect(result).toEqual({ data: { id: 'cus_existing' }, error: null })
    expect(customer.update).toHaveBeenCalledWith({
      where: { id: 'cus_existing' },
      data: expect.objectContaining({
        name: 'Efesto',
        companyName: 'Efesto Technologies',
        firstName: 'Ada',
        lastName: 'Byron',
        customerKind: 'BUSINESS',
        coreSyncedAt: 1_783_771_200,
      }),
    })
    expect(contact.update).toHaveBeenCalledWith({
      where: { id: 'con_existing' },
      data: {
        firstName: 'Ada',
        lastName: 'Byron',
        email: 'ada@byron.test',
        isPrimary: true,
        coreSyncedAt: 1_783_771_200,
        updatedAt: 1_783_771_200,
      },
    })
    expect(contact.create).not.toHaveBeenCalled()
    expect(contact.updateMany).not.toHaveBeenCalled()
  })

  it('does not seed a contact when primaryContact is omitted', async () => {
    const { contact } = prismaCustomer()

    await ensure('ten_123', {
      customerType: 'CORE_USER',
      userId: 'usr_123',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
    })

    expect(contact.findFirst).not.toHaveBeenCalled()
    expect(contact.create).not.toHaveBeenCalled()
  })

  it('does not seed a contact when primaryContact has no userId', async () => {
    const { contact } = prismaCustomer()

    await ensure('ten_123', {
      customerType: 'CORE_ORGANIZATION',
      organizationId: 'org_123',
      name: 'Efesto',
      // Schema requires userId; call ensure with a cast so the runtime guard is
      // the unit under test.
      primaryContact: {
        firstName: 'Ghost',
      } as never,
    })

    expect(contact.findFirst).not.toHaveBeenCalled()
    expect(contact.create).not.toHaveBeenCalled()
  })

  it('defaults customerKind from customerType when Core omits it', async () => {
    const { customer } = prismaCustomer()
    customer.findFirst.mockResolvedValue({ id: 'cus_existing' })

    await ensure('ten_123', {
      customerType: 'CORE_USER',
      userId: 'usr_123',
      name: 'Ada',
    })

    expect(customer.update).toHaveBeenCalledWith({
      where: { id: 'cus_existing' },
      data: expect.objectContaining({ customerKind: 'INDIVIDUAL' }),
    })
  })

  it('honours an explicit customerKind on ensure', async () => {
    const { customer } = prismaCustomer()
    customer.findFirst.mockResolvedValue({ id: 'cus_existing' })

    await ensure('ten_123', {
      customerType: 'CORE_ORGANIZATION',
      organizationId: 'org_123',
      name: 'Efesto',
      customerKind: 'BUSINESS',
    })

    expect(customer.update).toHaveBeenCalledWith({
      where: { id: 'cus_existing' },
      data: expect.objectContaining({ customerKind: 'BUSINESS' }),
    })
  })

  it('propagates a non-conflict create failure without contact work', async () => {
    const { customer, contact } = prismaCustomer()
    customer.create.mockRejectedValue(new Error('disk full'))

    const result = await ensure('ten_123', {
      customerType: 'CORE_ORGANIZATION',
      organizationId: 'org_123',
      name: 'Efesto',
      primaryContact: {
        userId: 'usr_owner',
        firstName: 'Ada',
      },
    })

    expect(result.error).toBeTruthy()
    expect(result.status).toBe(500)
    expect(contact.findFirst).not.toHaveBeenCalled()
    expect(contact.create).not.toHaveBeenCalled()
  })

  it('does not sync contact when race re-query finds no winner', async () => {
    const { customer, contact } = prismaCustomer()
    customer.findFirst.mockResolvedValue(null)
    customer.create.mockRejectedValue({ code: 'P2002' })

    const result = await ensure('ten_123', {
      customerType: 'CORE_ORGANIZATION',
      organizationId: 'org_123',
      name: 'Efesto',
      primaryContact: { userId: 'usr_owner', firstName: 'Ada' },
    })

    expect(result.status).toBe(409)
    // Race path returns without calling syncPrimaryContact.
    expect(contact.create).not.toHaveBeenCalled()
  })

  it('does not sync contact after a race win either', async () => {
    // Documented current behaviour: race winner is returned by id only —
    // contact seeding is left to a later ensure retry.
    const { customer, contact } = prismaCustomer()
    customer.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'cus_winner' })
    customer.create.mockRejectedValue({ code: 'P2002' })

    const result = await ensure('ten_123', {
      customerType: 'CORE_ORGANIZATION',
      organizationId: 'org_123',
      name: 'Efesto',
      primaryContact: { userId: 'usr_owner', firstName: 'Ada' },
    })

    expect(result).toEqual({ data: { id: 'cus_winner' }, error: null })
    expect(contact.create).not.toHaveBeenCalled()
    expect(contact.update).not.toHaveBeenCalled()
  })

  it('treats null primaryContact the same as omitted', async () => {
    const { contact } = prismaCustomer()

    await ensure('ten_123', {
      customerType: 'CORE_ORGANIZATION',
      organizationId: 'org_123',
      name: 'Efesto',
      primaryContact: null,
    })

    expect(contact.findFirst).not.toHaveBeenCalled()
  })

  it('writes null optional party fields explicitly on update', async () => {
    const { customer } = prismaCustomer()
    customer.findFirst.mockResolvedValue({ id: 'cus_existing' })

    await ensure('ten_123', {
      customerType: 'CORE_USER',
      userId: 'usr_1',
      name: 'Ada',
      email: null,
      companyName: null,
      firstName: null,
      lastName: null,
      phone: null,
    })

    expect(customer.update).toHaveBeenCalledWith({
      where: { id: 'cus_existing' },
      data: {
        name: 'Ada',
        email: null,
        companyName: null,
        firstName: null,
        lastName: null,
        phone: null,
        customerKind: 'INDIVIDUAL',
        coreSyncedAt: 1_783_771_200,
        updatedAt: 1_783_771_200,
      },
    })
  })

  it('coerces undefined email to null on create path', async () => {
    const { customer } = prismaCustomer()

    await ensure('ten_123', {
      customerType: 'CORE_USER',
      userId: 'usr_1',
      name: 'Ada',
      email: undefined,
    })

    expect(customer.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ email: null }),
    })
  })

  it('refreshes contact with null names when Core clears them', async () => {
    const { customer, contact } = prismaCustomer()
    customer.findFirst.mockResolvedValue({ id: 'cus_existing' })
    contact.findFirst.mockResolvedValue({ id: 'con_existing' })

    await ensure('ten_123', {
      customerType: 'CORE_ORGANIZATION',
      organizationId: 'org_123',
      name: 'Efesto',
      primaryContact: {
        userId: 'usr_owner',
        firstName: null,
        lastName: null,
        email: null,
      },
    })

    expect(contact.update).toHaveBeenCalledWith({
      where: { id: 'con_existing' },
      data: {
        firstName: null,
        lastName: null,
        email: null,
        isPrimary: true,
        coreSyncedAt: 1_783_771_200,
        updatedAt: 1_783_771_200,
      },
    })
  })
})
