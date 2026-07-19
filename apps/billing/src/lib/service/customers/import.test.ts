import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'

import { CustomerImportSchema } from '@/types/customer'

const mocks = vi.hoisted(() => ({
  prismaRef: { current: null as unknown as Record<string, unknown> },
  create: vi.fn(),
  update: vi.fn(),
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
vi.mock('./create', () => ({ create: mocks.create }))
vi.mock('./update', () => ({ update: mocks.update }))

import { importCustomers } from './import'

type TestDatabase = {
  tenant: { findUnique: ReturnType<typeof vi.fn> }
  customer: {
    findFirst: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
  }
  tenantCurrency: { findFirst: ReturnType<typeof vi.fn> }
  language: { findFirst: ReturnType<typeof vi.fn> }
  address: { create: ReturnType<typeof vi.fn> }
  contact: { create: ReturnType<typeof vi.fn> }
  customerImportReceipt: {
    findUnique: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }
  $transaction: ReturnType<typeof vi.fn>
}

function database(): TestDatabase {
  return mocks.prismaRef.current as unknown as TestDatabase
}

function params(overrides: Record<string, unknown> = {}) {
  return CustomerImportSchema.parse({
    duplicateStrategy: 'skip',
    rows: [{ rowNumber: 2, name: 'Island Supplies' }],
    ...overrides,
  })
}

describe('importCustomers', () => {
  beforeEach(() => {
    const customer = {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
    }
    const tx = {
      tenant: {
        findUnique: vi.fn().mockResolvedValue({
          defaultCurrency: 'JMD',
          defaultLanguage: 'en',
        }),
      },
      customer,
      tenantCurrency: {
        findFirst: vi.fn().mockResolvedValue({ tenantId: 'ten_123' }),
      },
      language: { findFirst: vi.fn().mockResolvedValue({ code: 'en' }) },
      address: { create: vi.fn().mockResolvedValue({ id: 'addr_123' }) },
      contact: { create: vi.fn().mockResolvedValue({ id: 'con_123' }) },
      customerImportReceipt: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
      },
      $transaction: vi.fn(),
    }
    tx.$transaction.mockImplementation(
      (callback: (transaction: typeof tx) => unknown) => callback(tx)
    )
    mocks.prismaRef.current = tx
    mocks.create.mockResolvedValue({ data: { id: 'cus_new' }, error: null })
    mocks.update.mockResolvedValue({
      data: { id: 'cus_existing' },
      error: null,
    })
    mocks.generateId.mockReset()
    mocks.generateId
      .mockReturnValueOnce('addr_billing')
      .mockReturnValueOnce('addr_shipping')
      .mockReturnValueOnce('con_primary')
    mocks.nowUnixSeconds.mockReturnValue(1_784_419_200)
    vi.clearAllMocks()
  })

  it('creates a customer and its default addresses and primary contact atomically', async () => {
    const input = params({
      duplicateStrategy: 'update',
      rows: [
        {
          rowNumber: 4,
          name: 'Island Supplies',
          customerKind: 'BUSINESS',
          customerNumber: 'C-104',
          website: 'island.test',
          notes: 'Wholesale account.',
          taxRegistrationNumber: 'TRN-123',
          billingAddress: { line1: '10 Ocean Road', countryCode: 'jm' },
          shippingAddress: { city: 'Kingston' },
          contact: { firstName: 'Nia', email: 'nia@island.test' },
        },
      ],
    })

    const result = await importCustomers('ten_123', input, {
      sourceAppId: 'app_couriers',
      idempotencyKey: 'import-4',
    })

    expect(result).toEqual({
      data: {
        object: 'customer_import',
        dryRun: false,
        duplicateStrategy: 'update',
        summary: { created: 1, updated: 0, skipped: 0, failed: 0 },
        results: [
          {
            rowNumber: 4,
            action: 'created',
            customerId: 'cus_new',
            error: null,
          },
        ],
      },
      error: null,
    })
    expect(database().$transaction).toHaveBeenCalledTimes(1)
    expect(database().customerImportReceipt.findUnique).toHaveBeenCalledWith({
      where: {
        tenantId_sourceAppId_idempotencyKey: {
          tenantId: 'ten_123',
          sourceAppId: 'app_couriers',
          idempotencyKey: 'import-4',
        },
      },
    })
    expect(database().customerImportReceipt.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'ten_123',
        sourceAppId: 'app_couriers',
        idempotencyKey: 'import-4',
        payloadHash: createHash('sha256')
          .update(JSON.stringify(input))
          .digest('hex'),
        result: result.data,
        createdAt: 1_784_419_200,
      },
    })
    expect(mocks.create).toHaveBeenCalledTimes(1)
    expect(mocks.create).toHaveBeenCalledWith(
      'ten_123',
      expect.objectContaining({
        customerType: 'EXTERNAL',
        customerKind: 'BUSINESS',
        customerNumber: 'C-104',
        website: 'island.test',
        notes: 'Wholesale account.',
        taxRegistrationNumber: 'TRN-123',
      }),
      undefined,
      database()
    )
    expect(database().address.create.mock.calls).toEqual([
      [
        {
          data: {
            id: 'addr_billing',
            tenantId: 'ten_123',
            customerId: 'cus_new',
            type: 'billing',
            line1: '10 Ocean Road',
            countryCode: 'JM',
            isDefault: true,
            createdAt: 1_784_419_200,
            updatedAt: 1_784_419_200,
          },
        },
      ],
      [
        {
          data: {
            id: 'addr_shipping',
            tenantId: 'ten_123',
            customerId: 'cus_new',
            type: 'shipping',
            city: 'Kingston',
            isDefault: true,
            createdAt: 1_784_419_200,
            updatedAt: 1_784_419_200,
          },
        },
      ],
    ])
    expect(database().contact.create).toHaveBeenCalledWith({
      data: {
        id: 'con_primary',
        tenantId: 'ten_123',
        customerId: 'cus_new',
        firstName: 'Nia',
        email: 'nia@island.test',
        isPrimary: true,
        createdAt: 1_784_419_200,
        updatedAt: 1_784_419_200,
      },
    })
  })

  it('skips the exact customer-number match before checking email or name', async () => {
    database().customer.findFirst.mockResolvedValue({ id: 'cus_numbered' })
    const input = params({
      rows: [
        {
          rowNumber: 8,
          name: 'Renamed Customer',
          customerNumber: 'C-108',
          email: 'billing@renamed.test',
        },
      ],
    })

    const result = await importCustomers('ten_123', input)

    expect(result.data?.results).toEqual([
      {
        rowNumber: 8,
        action: 'skipped',
        customerId: 'cus_numbered',
        error: null,
      },
    ])
    expect(database().customer.findFirst).toHaveBeenCalledWith({
      where: { tenantId: 'ten_123', customerNumber: 'C-108' },
      select: { id: true },
    })
    expect(database().customer.findMany).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('updates only supplied scalar fields and leaves related rows unchanged', async () => {
    database().customer.findMany.mockResolvedValueOnce([{ id: 'cus_email' }])
    const input = params({
      duplicateStrategy: 'update',
      rows: [
        {
          rowNumber: 12,
          name: 'Island Supplies Updated',
          email: 'BILLING@ISLAND.TEST',
          notes: null,
          billingAddress: { city: 'Montego Bay' },
          contact: { firstName: 'New Contact' },
        },
      ],
    })

    const result = await importCustomers('ten_123', input)

    expect(result.data?.results).toEqual([
      {
        rowNumber: 12,
        action: 'updated',
        customerId: 'cus_email',
        error: null,
      },
    ])
    expect(database().customer.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'ten_123',
        email: { equals: 'billing@island.test', mode: 'insensitive' },
      },
      select: { id: true },
      take: 2,
    })
    expect(mocks.update).toHaveBeenCalledWith(
      'ten_123',
      'cus_email',
      {
        name: 'Island Supplies Updated',
        email: 'BILLING@ISLAND.TEST',
        notes: null,
      },
      database()
    )
    expect(database().address.create).not.toHaveBeenCalled()
    expect(database().contact.create).not.toHaveBeenCalled()
  })

  it('fails an ambiguous email match without trying the name fallback', async () => {
    database().customer.findMany.mockResolvedValueOnce([
      { id: 'cus_1' },
      { id: 'cus_2' },
    ])
    const input = params({
      duplicateStrategy: 'update',
      rows: [
        {
          rowNumber: 16,
          name: 'Ambiguous Customer',
          email: 'shared@island.test',
        },
      ],
    })

    const result = await importCustomers('ten_123', input)

    expect(result.data).toEqual({
      object: 'customer_import',
      dryRun: false,
      duplicateStrategy: 'update',
      summary: { created: 0, updated: 0, skipped: 0, failed: 1 },
      results: [
        {
          rowNumber: 16,
          action: 'failed',
          customerId: null,
          error: {
            code: 'billing/import-ambiguous-match',
            message: 'Multiple customers match this import row.',
          },
        },
      ],
    })
    expect(database().customer.findMany).toHaveBeenCalledTimes(1)
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('isolates a thrown row failure and continues with the next transaction', async () => {
    database()
      .$transaction.mockRejectedValueOnce(new Error('row transaction failed'))
      .mockImplementationOnce(
        (callback: (transaction: TestDatabase) => unknown) =>
          callback(database())
      )
    const input = params({
      rows: [
        { rowNumber: 20, name: 'Failed Customer' },
        { rowNumber: 21, name: 'Successful Customer' },
      ],
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await importCustomers('ten_123', input)

    expect(result.data?.summary).toEqual({
      created: 1,
      updated: 0,
      skipped: 0,
      failed: 1,
    })
    expect(result.data?.results).toEqual([
      {
        rowNumber: 20,
        action: 'failed',
        customerId: null,
        error: {
          code: 'error/unknown',
          message: 'Failed to import this customer.',
        },
      },
      {
        rowNumber: 21,
        action: 'created',
        customerId: 'cus_new',
        error: null,
      },
    ])
    expect(database().$transaction).toHaveBeenCalledTimes(2)
    expect(mocks.create).toHaveBeenCalledTimes(1)
  })

  it('returns a failed row for an unavailable currency without aborting the batch', async () => {
    database()
      .tenantCurrency.findFirst.mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ tenantId: 'ten_123' })
    const input = params({
      rows: [
        { rowNumber: 24, name: 'USD Customer', currency: 'USD' },
        { rowNumber: 25, name: 'JMD Customer', currency: 'JMD' },
      ],
    })

    const result = await importCustomers('ten_123', input)

    expect(result.data?.results).toEqual([
      {
        rowNumber: 24,
        action: 'failed',
        customerId: null,
        error: {
          code: 'validation/invalid-request',
          message: 'Enable the customer currency before using it.',
        },
      },
      {
        rowNumber: 25,
        action: 'created',
        customerId: 'cus_new',
        error: null,
      },
    ])
    expect(database().$transaction).toHaveBeenCalledTimes(2)
    expect(mocks.create).toHaveBeenCalledTimes(1)
  })

  it('previews matching and validation without any database writes', async () => {
    const input = params({
      dryRun: true,
      duplicateStrategy: 'update',
      rows: [
        { rowNumber: 30, name: 'Preview Customer', website: 'preview.test' },
      ],
    })

    const result = await importCustomers('ten_123', input, {
      sourceAppId: 'app_couriers',
      idempotencyKey: 'preview-30',
    })

    expect(result).toEqual({
      data: {
        object: 'customer_import',
        dryRun: true,
        duplicateStrategy: 'update',
        summary: { created: 1, updated: 0, skipped: 0, failed: 0 },
        results: [
          {
            rowNumber: 30,
            action: 'created',
            customerId: null,
            error: null,
          },
        ],
      },
      error: null,
    })
    expect(database().$transaction).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
    expect(database().address.create).not.toHaveBeenCalled()
    expect(database().contact.create).not.toHaveBeenCalled()
    expect(database().customerImportReceipt.findUnique).not.toHaveBeenCalled()
    expect(database().customerImportReceipt.create).not.toHaveBeenCalled()
  })

  it('replays the stored import result without reapplying any rows', async () => {
    const input = params({
      rows: [{ rowNumber: 34, name: 'Replay Customer' }],
    })
    const storedResult = {
      object: 'customer_import',
      dryRun: false,
      duplicateStrategy: 'skip',
      summary: { created: 1, updated: 0, skipped: 0, failed: 0 },
      results: [
        {
          rowNumber: 34,
          action: 'created',
          customerId: 'cus_replayed',
          error: null,
        },
      ],
    }
    database().customerImportReceipt.findUnique.mockResolvedValue({
      payloadHash: createHash('sha256')
        .update(JSON.stringify(input))
        .digest('hex'),
      result: storedResult,
    })

    const result = await importCustomers('ten_123', input, {
      sourceAppId: 'app_couriers',
      idempotencyKey: 'import-34',
    })

    expect(result).toEqual({ data: storedResult, error: null })
    expect(database().tenant.findUnique).not.toHaveBeenCalled()
    expect(database().$transaction).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
    expect(database().customerImportReceipt.create).not.toHaveBeenCalled()
  })
})
