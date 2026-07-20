import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CustomerImportRequest } from '@/types/customer-import'

import { importCustomers } from './import'

const mocks = vi.hoisted(() => ({
  prismaRef: { current: null as unknown as Record<string, unknown> },
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

type PrismaMock = {
  tenant: { findUnique: ReturnType<typeof vi.fn> }
  tenantCurrency: { findMany: ReturnType<typeof vi.fn> }
  customer: {
    findMany: ReturnType<typeof vi.fn>
    createMany: ReturnType<typeof vi.fn>
  }
}

let prismaMock: PrismaMock

function request(rows: Record<string, string>[]): CustomerImportRequest {
  return { rows }
}

let idCounter = 0

describe('service.customers.import', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    idCounter = 0
    prismaMock = {
      tenant: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ defaultCurrency: 'JMD', defaultLanguage: 'en' }),
      },
      tenantCurrency: {
        findMany: vi
          .fn()
          .mockResolvedValue([
            { currencyCode: 'JMD' },
            { currencyCode: 'USD' },
          ]),
      },
      customer: {
        findMany: vi.fn().mockResolvedValue([]),
        createMany: vi
          .fn()
          .mockImplementation(({ data }: { data: unknown[] }) => ({
            count: data.length,
          })),
      },
    }
    mocks.prismaRef.current = prismaMock
    mocks.generateId.mockImplementation(() => `cus_${++idCounter}`)
    mocks.nowUnixSeconds.mockReturnValue(1_783_771_200)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('imports valid rows and reports an all-imported summary', async () => {
    const result = await importCustomers(
      'ten_1',
      request([
        { name: 'Marlon Grant', email: 'marlon@example.com' },
        { name: 'Ayana Reid', email: 'ayana@example.com' },
      ])
    )

    expect(result.error).toBeNull()
    expect(result.data).toEqual({
      object: 'customer_import',
      total: 2,
      imported: 2,
      skipped: 0,
      failed: 0,
      rows: [
        { index: 0, name: 'Marlon Grant', status: 'imported' },
        { index: 1, name: 'Ayana Reid', status: 'imported' },
      ],
    })
    expect(prismaMock.customer.createMany).toHaveBeenCalledTimes(1)
  })

  it('passes EXTERNAL customer data with workspace defaults to createMany', async () => {
    await importCustomers('ten_1', request([{ name: 'Marlon Grant' }]))

    expect(prismaMock.customer.createMany).toHaveBeenCalledWith({
      skipDuplicates: true,
      data: [
        {
          id: 'cus_1',
          tenantId: 'ten_1',
          customerType: 'EXTERNAL',
          customerKind: 'INDIVIDUAL',
          name: 'Marlon Grant',
          salutation: null,
          firstName: null,
          lastName: null,
          companyName: null,
          email: null,
          phone: null,
          workPhone: null,
          externalReference: null,
          defaultCurrency: 'JMD',
          language: 'en',
          coreSyncedAt: null,
          status: 'ACTIVE',
          createdAt: 1_783_771_200,
          updatedAt: 1_783_771_200,
        },
      ],
    })
  })

  it('maps the BUSINESS kind and a per-row currency from the file', async () => {
    await importCustomers(
      'ten_1',
      request([
        {
          name: 'Blue Mountain Ltd',
          customerKind: 'Business',
          currency: 'usd',
        },
      ])
    )

    expect(prismaMock.customer.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            customerKind: 'BUSINESS',
            defaultCurrency: 'USD',
          }),
        ],
      })
    )
  })

  it('skips a row that matches an existing customer email', async () => {
    prismaMock.customer.findMany.mockResolvedValue([
      { externalReference: null, email: 'existing@example.com' },
    ])

    const result = await importCustomers(
      'ten_1',
      request([
        { name: 'New Person', email: 'new@example.com' },
        { name: 'Dup Person', email: 'Existing@example.com' },
      ])
    )

    expect(result.data?.imported).toBe(1)
    expect(result.data?.skipped).toBe(1)
    expect(result.data?.rows[1]).toEqual({
      index: 1,
      name: 'Dup Person',
      status: 'skipped',
      reason: 'A customer with this email or external ID already exists.',
    })
    expect(prismaMock.customer.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [expect.objectContaining({ name: 'New Person' })],
      })
    )
  })

  it('skips a row that matches an existing externalReference', async () => {
    prismaMock.customer.findMany.mockResolvedValue([
      { externalReference: 'CUST-1', email: null },
    ])

    const result = await importCustomers(
      'ten_1',
      request([{ name: 'Repeat', externalReference: 'CUST-1' }])
    )

    expect(result.data?.imported).toBe(0)
    expect(result.data?.skipped).toBe(1)
    expect(prismaMock.customer.createMany).toHaveBeenCalledWith({
      skipDuplicates: true,
      data: [],
    })
  })

  it('skips an in-file duplicate email, keeping the first occurrence', async () => {
    const result = await importCustomers(
      'ten_1',
      request([
        { name: 'First', email: 'same@example.com' },
        { name: 'Second', email: 'same@example.com' },
      ])
    )

    expect(result.data?.imported).toBe(1)
    expect(result.data?.skipped).toBe(1)
    expect(result.data?.rows[0].status).toBe('imported')
    expect(result.data?.rows[1].status).toBe('skipped')
  })

  it('prefers externalReference over email as the dedup key', async () => {
    prismaMock.customer.findMany.mockResolvedValue([
      { externalReference: 'CODE-9', email: null },
    ])

    const result = await importCustomers(
      'ten_1',
      request([
        {
          name: 'Has Both',
          email: 'brand-new@example.com',
          externalReference: 'CODE-9',
        },
      ])
    )

    expect(result.data?.skipped).toBe(1)
    expect(result.data?.imported).toBe(0)
  })

  it('fails a row missing the required name and does not insert it', async () => {
    const result = await importCustomers(
      'ten_1',
      request([{ email: 'no-name@example.com' }, { name: 'Valid' }])
    )

    expect(result.data?.imported).toBe(1)
    expect(result.data?.failed).toBe(1)
    expect(result.data?.rows[0].status).toBe('failed')
    expect(result.data?.rows[0].reason).toBeTruthy()
    expect(prismaMock.customer.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [expect.objectContaining({ name: 'Valid' })],
      })
    )
  })

  it('fails a row whose currency is not enabled in the workspace', async () => {
    const result = await importCustomers(
      'ten_1',
      request([{ name: 'Wrong Currency', currency: 'EUR' }])
    )

    expect(result.data?.failed).toBe(1)
    expect(result.data?.imported).toBe(0)
    expect(result.data?.rows[0]).toEqual({
      index: 0,
      name: 'Wrong Currency',
      status: 'failed',
      reason: 'Currency EUR is not enabled in this workspace.',
    })
    expect(prismaMock.customer.createMany).toHaveBeenCalledWith({
      skipDuplicates: true,
      data: [],
    })
  })

  it('fails a row with an invalid email address', async () => {
    const result = await importCustomers(
      'ten_1',
      request([{ name: 'Bad Email', email: 'not-an-email' }])
    )

    expect(result.data?.failed).toBe(1)
    expect(result.data?.rows[0].status).toBe('failed')
  })

  it('reconciles a createMany unique-race shortfall by flipping the trailing row to skipped', async () => {
    prismaMock.customer.createMany.mockResolvedValue({ count: 1 })

    const result = await importCustomers(
      'ten_1',
      request([
        { name: 'One', email: 'one@example.com' },
        { name: 'Two', email: 'two@example.com' },
      ])
    )

    expect(result.data?.imported).toBe(1)
    expect(result.data?.skipped).toBe(1)
    expect(result.data?.rows[0].status).toBe('imported')
    expect(result.data?.rows[1].status).toBe('skipped')
  })

  it('returns a 404 error when the workspace does not exist', async () => {
    prismaMock.tenant.findUnique.mockResolvedValue(null)

    const result = await importCustomers(
      'ten_missing',
      request([{ name: 'X' }])
    )

    expect(result.data).toBeNull()
    expect(result).toEqual({
      data: null,
      error: 'Workspace not found.',
      status: 404,
    })
    expect(prismaMock.customer.createMany).not.toHaveBeenCalled()
  })

  const SECURITY_NAMES = [
    '<script>alert(1)</script>',
    "' OR '1'='1",
    '../../etc/passwd',
    '__proto__',
    'a'.repeat(160),
  ] as const

  it.each(SECURITY_NAMES)(
    'imports a hostile-looking but valid name verbatim: %s',
    async (name) => {
      const result = await importCustomers('ten_1', request([{ name }]))

      expect(result.data?.imported).toBe(1)
      expect(result.data?.failed).toBe(0)
      expect(prismaMock.customer.createMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: [expect.objectContaining({ name })] })
      )
    }
  )

  it('fails a name that exceeds the 160-character limit', async () => {
    const result = await importCustomers(
      'ten_1',
      request([{ name: 'a'.repeat(161) }])
    )

    expect(result.data?.failed).toBe(1)
    expect(result.data?.imported).toBe(0)
  })
})
