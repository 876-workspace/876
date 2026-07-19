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
    expect(mocks.hasEnabledCurrency).toHaveBeenCalledWith(
      'ten_123',
      'JMD',
      mocks.prismaRef.current
    )
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
        customerNumber: null,
        name: 'Efesto Technologies',
        salutation: null,
        firstName: null,
        lastName: null,
        companyName: null,
        email: null,
        phone: null,
        workPhone: null,
        website: null,
        notes: null,
        taxRegistrationNumber: null,
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

  it('persists the commercial customer enrichment fields', async () => {
    const customer = (
      mocks.prismaRef.current as unknown as {
        customer: { create: ReturnType<typeof vi.fn> }
      }
    ).customer
    const params = createParams({
      customerNumber: 'C-876',
      website: 'efesto.test',
      notes: 'Preferred commercial customer.',
      taxRegistrationNumber: 'TRN-876',
    })

    const result = await create('ten_123', params)

    expect(result).toEqual({ data: { id: 'cus_123' }, error: null })
    expect(customer.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        customerNumber: 'C-876',
        website: 'efesto.test',
        notes: 'Preferred commercial customer.',
        taxRegistrationNumber: 'TRN-876',
      }),
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
    expect(mocks.hasEnabledCurrency).toHaveBeenCalledWith(
      'ten_123',
      'JMD',
      mocks.prismaRef.current
    )
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

  it('maps a duplicate customer number to conflict', async () => {
    const customer = (
      mocks.prismaRef.current as unknown as {
        customer: { create: ReturnType<typeof vi.fn> }
      }
    ).customer
    customer.create.mockRejectedValue({ code: 'P2002' })

    const result = await create(
      'ten_123',
      createParams({ customerNumber: 'C-876' })
    )

    expect(result).toEqual({
      data: null,
      error:
        'A customer with this customer number already exists in this workspace.',
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
      customerNumber: 'C-877',
      website: 'group.efesto.test',
      notes: null,
      taxRegistrationNumber: 'TRN-877',
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
        customerNumber: 'C-877',
        website: 'group.efesto.test',
        notes: null,
        taxRegistrationNumber: 'TRN-877',
        defaultCurrency: null,
        status: 'ARCHIVED',
      },
    })
  })

  it('maps a duplicate customer number update to conflict', async () => {
    const customer = (
      mocks.prismaRef.current as unknown as {
        customer: { updateMany: ReturnType<typeof vi.fn> }
      }
    ).customer
    customer.updateMany.mockRejectedValue({ code: 'P2002' })

    const result = await update('ten_123', 'cus_123', {
      customerNumber: 'C-876',
    })

    expect(result).toEqual({
      data: null,
      error:
        'A customer with this customer number already exists in this workspace.',
      status: 409,
    })
    expect(console.error).not.toHaveBeenCalled()
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
})
