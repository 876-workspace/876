import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Prisma } from '@/db'

import type { InvoiceCreateParams } from '../schemas/invoice'
import type {
  RecurringInvoiceCreateParams,
  RecurringInvoiceUpdateParams,
} from '../schemas/recurring-invoice'
import {
  createRecurringInvoice,
  deleteRecurringInvoice,
  generateDueRecurringInvoice,
  recordRecurringInvoiceFailure,
  transitionRecurringInvoice,
  updateRecurringInvoice,
} from '../repositories/recurring-invoices.repository'

const mocks = vi.hoisted(() => {
  let counter = 0
  const prefixes: Record<string, string> = {
    RecurringInvoice: 'rinv',
    RecurringInvoiceLine: 'rinvl',
    RecurringInvoiceRun: 'rrun',
    Invoice: 'inv',
    InvoiceLine: 'invl',
  }
  return {
    prisma: {
      $transaction: vi.fn(),
      recurringInvoice: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      recurringInvoiceLine: { deleteMany: vi.fn() },
      recurringInvoiceRun: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        upsert: vi.fn(),
      },
      customer: { findFirst: vi.fn() },
      paymentTerm: { findFirst: vi.fn() },
      invoice: { update: vi.fn() },
      invoicePreference: { findUnique: vi.fn() },
      documentPreference: { findUnique: vi.fn() },
      tenant: { findUnique: vi.fn() },
    },
    hasEnabledCurrency: vi.fn(),
    buildDocumentLines: vi.fn(),
    invoiceCreate: vi.fn(),
    finalizeInvoice: vi.fn(),
    findInvoiceForSend: vi.fn(),
    markInvoiceSent: vi.fn(),
    realInvoiceCreate:
      null as unknown as typeof import('../repositories/invoices/create').create,
    generateId: (entity: string): string => {
      counter += 1
      return `${prefixes[entity] ?? entity.toLowerCase()}_test_${counter}`
    },
    resetIds: (): void => {
      counter = 0
    },
  }
})

vi.mock('@/db/client', () => ({ prisma: mocks.prisma }))
vi.mock('@/modules/currencies', () => ({
  hasEnabledCurrency: mocks.hasEnabledCurrency,
}))
vi.mock('../repositories/documents/lines', () => ({
  buildDocumentLines: mocks.buildDocumentLines,
}))
vi.mock('../repositories/invoices', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('../repositories/invoices')>()
  mocks.realInvoiceCreate = original.invoices.create
  return { invoices: { ...original.invoices, create: mocks.invoiceCreate } }
})
vi.mock('../workflows/finalize-invoice', () => ({
  finalizeInvoiceInTransaction: mocks.finalizeInvoice,
}))
vi.mock('../repositories/invoice-workflow', () => ({
  findInvoiceForSend: mocks.findInvoiceForSend,
  markInvoiceSent: mocks.markInvoiceSent,
}))
vi.mock('@/platform/ids', () => ({ generateId: mocks.generateId }))

const NOW = Date.UTC(2026, 8, 1, 12) / 1000
const JAN_15 = Date.UTC(2026, 0, 15, 12) / 1000
const JUN_15 = Date.UTC(2026, 5, 15, 12) / 1000
const JUL_15 = Date.UTC(2026, 6, 15, 12) / 1000
const AUG_15 = Date.UTC(2026, 7, 15, 12) / 1000
const AUG_20 = AUG_15 + 5 * 86_400
const SEP_10 = Date.UTC(2026, 8, 10, 12) / 1000
const SEP_15 = Date.UTC(2026, 8, 15, 12) / 1000
const NOV_15 = Date.UTC(2026, 10, 15, 12) / 1000

const TENANT = 'ten_kingston_01'
const CUSTOMER = 'cus_9fK2mQ8x'
const PROFILE = 'rinv_7Hk2Qm4Z'

const LINE_DESCRIPTION = 'Monthly retainer — Harbour View'

function createTemplate(
  overrides: Partial<RecurringInvoiceCreateParams> = {}
): RecurringInvoiceCreateParams {
  return {
    profileName: 'Harbour View monthly retainer',
    customerId: CUSTOMER,
    currency: 'JMD',
    frequency: { intervalUnit: 'month', intervalCount: 1 },
    startAt: NOW - 3_600,
    endAt: null,
    maxCycles: null,
    generationMode: 'finalize',
    paymentTermId: null,
    salespersonId: null,
    priceListId: null,
    taxBehavior: 'EXCLUSIVE',
    notes: null,
    terms: null,
    discountAmount: 0n,
    lines: [
      {
        itemId: null,
        variantId: null,
        priceId: null,
        description: LINE_DESCRIPTION,
        quantity: 1,
        unitAmount: 4_500_000n,
        taxAmount: 675_000n,
        discountAmount: 0n,
      },
    ],
    ...overrides,
  }
}

function profileLine() {
  return {
    id: 'rinvl_existing_1',
    itemId: null,
    variantId: null,
    priceId: null,
    description: LINE_DESCRIPTION,
    quantity: 1,
    unitAmount: 4_500_000n,
    taxAmount: 675_000n,
    discountAmount: 0n,
    position: 0,
    createdAt: JAN_15,
    updatedAt: AUG_15,
  }
}

function profileRow(overrides: Record<string, unknown> = {}) {
  return {
    id: PROFILE,
    tenantId: TENANT,
    profileName: 'Harbour View monthly retainer',
    customerId: CUSTOMER,
    currency: 'JMD',
    status: 'ACTIVE',
    intervalUnit: 'MONTH',
    intervalCount: 1,
    startAt: JAN_15,
    endAt: null,
    maxCycles: null,
    nextRunAt: SEP_15,
    lastRunAt: AUG_15,
    generatedCount: 2,
    generationMode: 'FINALIZE',
    paymentTermId: null,
    salespersonId: null,
    priceListId: null,
    taxBehavior: 'EXCLUSIVE',
    notes: null,
    terms: null,
    discountAmount: 0n,
    subtotalAmount: 4_500_000n,
    taxAmount: 675_000n,
    totalAmount: 5_175_000n,
    createdAt: JAN_15,
    updatedAt: AUG_15,
    deletedAt: null,
    lines: [profileLine()],
    ...overrides,
  }
}

function generationProfile(overrides: Record<string, unknown> = {}) {
  return profileRow({
    generationMode: 'DRAFT',
    nextRunAt: AUG_15,
    lastRunAt: JUL_15,
    ...overrides,
  })
}

function generationTx(profile: ReturnType<typeof profileRow>) {
  return {
    recurringInvoice: {
      findFirst: vi.fn().mockResolvedValue(profile),
      update: vi.fn().mockResolvedValue(profile),
    },
    recurringInvoiceRun: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi
        .fn()
        .mockImplementation(
          async (args: { data: Record<string, unknown> }) => ({
            ...args.data,
          })
        ),
      update: vi.fn().mockResolvedValue({}),
    },
    customer: { findFirst: vi.fn().mockResolvedValue({ id: CUSTOMER }) },
    paymentTerm: { findFirst: vi.fn().mockResolvedValue(null) },
    invoice: {
      update: vi.fn().mockResolvedValue({}),
      findFirst: vi.fn().mockResolvedValue(null),
    },
  }
}

function invoiceTx() {
  return {
    documentSequence: {
      upsert: vi.fn().mockResolvedValue({ nextNumber: 2 }),
    },
    invoice: {
      create: vi.fn().mockResolvedValue({ id: 'inv_test_9' }),
    },
  }
}

function invoiceParams(): InvoiceCreateParams {
  return {
    customerId: CUSTOMER,
    currency: 'JMD',
    lines: [
      {
        description: LINE_DESCRIPTION,
        quantity: 1,
        unitAmount: 4_500_000n,
      },
    ],
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.resetIds()
  vi.useFakeTimers()
  vi.setSystemTime(NOW * 1000)
  mocks.hasEnabledCurrency.mockResolvedValue(true)
  mocks.buildDocumentLines.mockResolvedValue({
    data: {
      lines: [
        {
          itemId: null,
          variantId: null,
          variantName: null,
          variantSku: null,
          priceId: null,
          description: LINE_DESCRIPTION,
          unit: null,
          quantity: 1,
          unitAmount: 4_500_000n,
          taxAmount: 675_000n,
          discountAmount: 0n,
          totalAmount: 5_175_000n,
        },
      ],
      lineAmounts: [
        {
          subtotalAmount: 4_500_000n,
          taxAmount: 675_000n,
          discountAmount: 0n,
        },
      ],
      subtotalAmount: 4_500_000n,
      taxAmount: 675_000n,
      totalAmount: 5_175_000n,
      priceList: null,
    },
    error: null,
  })
  mocks.invoiceCreate.mockResolvedValue({
    data: { id: 'inv_test_1' },
    error: null,
  })
  mocks.finalizeInvoice.mockResolvedValue({
    data: { id: 'inv_test_1' },
    error: null,
  })
  mocks.findInvoiceForSend.mockResolvedValue({
    id: 'inv_test_1',
    status: 'OPEN',
    sentAt: null,
  })
  mocks.markInvoiceSent.mockResolvedValue({ id: 'inv_test_1' })
  mocks.prisma.customer.findFirst.mockResolvedValue({
    id: CUSTOMER,
    name: 'Harbour View Ltd',
    email: 'accounts@harbourview.test',
    taxBehaviorOverride: null,
    invoiceNotes: null,
    invoiceTerms: null,
    addresses: [],
  })
  mocks.prisma.invoicePreference.findUnique.mockResolvedValue({
    defaultTaxBehavior: 'EXCLUSIVE',
    defaultNotes: null,
    defaultTerms: null,
  })
  mocks.prisma.documentPreference.findUnique.mockResolvedValue(null)
  mocks.prisma.tenant.findUnique.mockResolvedValue({ defaultCurrency: 'JMD' })
  mocks.prisma.recurringInvoice.findFirst.mockResolvedValue(null)
  mocks.prisma.recurringInvoice.create.mockImplementation(
    async (args: { data: Record<string, unknown> }) => ({
      ...args.data,
      lines: [],
    })
  )
  mocks.prisma.recurringInvoice.update.mockImplementation(
    async (args: { data: Record<string, unknown> }) => ({
      ...profileRow(),
      ...args.data,
    })
  )
  mocks.prisma.$transaction.mockImplementation(
    async (work: (tx: unknown) => Promise<unknown>) => work(mocks.prisma)
  )
})

afterEach(() => {
  vi.useRealTimers()
})

describe('createRecurringInvoice', () => {
  it('starts a recent profile on its start date', async () => {
    // ARRANGE
    const startAt = NOW - 3_600
    const template = createTemplate({ startAt })

    // ACT
    const result = await createRecurringInvoice(TENANT, template)

    // ASSERT
    expect(result.error).toBeNull()
    expect(mocks.prisma.recurringInvoice.create).toHaveBeenCalledTimes(1)
    expect(mocks.prisma.recurringInvoice.create).toHaveBeenCalledWith({
      data: {
        id: 'rinv_test_1',
        tenantId: TENANT,
        status: 'ACTIVE',
        generatedCount: 0,
        lastRunAt: null,
        nextRunAt: startAt,
        createdAt: NOW,
        profileName: 'Harbour View monthly retainer',
        customerId: CUSTOMER,
        currency: 'JMD',
        intervalUnit: 'MONTH',
        intervalCount: 1,
        startAt,
        endAt: null,
        maxCycles: null,
        generationMode: 'FINALIZE',
        paymentTermId: null,
        salespersonId: null,
        priceListId: null,
        taxBehavior: 'EXCLUSIVE',
        notes: null,
        terms: null,
        subtotalAmount: 4_500_000n,
        discountAmount: 0n,
        taxAmount: 675_000n,
        totalAmount: 5_175_000n,
        updatedAt: NOW,
        lines: {
          create: [
            {
              id: 'rinvl_test_2',
              itemId: null,
              variantId: null,
              priceId: null,
              description: LINE_DESCRIPTION,
              quantity: 1,
              unitAmount: 4_500_000n,
              taxAmount: 675_000n,
              discountAmount: 0n,
              position: 0,
              createdAt: NOW,
              updatedAt: NOW,
            },
          ],
        },
      },
      include: { lines: true },
    })
  })

  it('starts an old profile on the next anchored occurrence without back-filling', async () => {
    // ARRANGE
    const template = createTemplate({ startAt: JUN_15 })

    // ACT
    const result = await createRecurringInvoice(TENANT, template)

    // ASSERT
    expect(result.error).toBeNull()
    expect(mocks.prisma.recurringInvoice.create).toHaveBeenCalledTimes(1)
    expect(mocks.prisma.recurringInvoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ nextRunAt: SEP_15 }),
      })
    )
  })

  it('rejects a disabled currency without writing a profile', async () => {
    // ARRANGE
    mocks.hasEnabledCurrency.mockResolvedValue(false)

    // ACT
    const result = await createRecurringInvoice(TENANT, createTemplate())

    // ASSERT
    expect(result).toEqual({
      data: null,
      error: 'Enable the recurring invoice currency before using it.',
      status: 422,
      code: 'billing/recurring-invoice-currency-disabled',
    })
    expect(mocks.hasEnabledCurrency).toHaveBeenCalledTimes(1)
    expect(mocks.hasEnabledCurrency).toHaveBeenCalledWith(TENANT, 'JMD')
    expect(mocks.prisma.recurringInvoice.create).not.toHaveBeenCalled()
  })

  it('rejects an inactive customer without writing a profile', async () => {
    // ARRANGE
    mocks.prisma.customer.findFirst.mockResolvedValue(null)

    // ACT
    const result = await createRecurringInvoice(TENANT, createTemplate())

    // ASSERT
    expect(result).toEqual({
      data: null,
      error: 'The selected customer was not found.',
      status: 404,
      code: 'billing/recurring-invoice-customer-not-found',
    })
    expect(mocks.prisma.customer.findFirst).toHaveBeenCalledTimes(1)
    expect(mocks.prisma.customer.findFirst).toHaveBeenCalledWith({
      where: { id: CUSTOMER, tenantId: TENANT, status: 'ACTIVE' },
      select: { id: true },
    })
    expect(mocks.prisma.recurringInvoice.create).not.toHaveBeenCalled()
  })

  it('rejects invalid template lines without writing a profile', async () => {
    // ARRANGE
    mocks.buildDocumentLines.mockResolvedValue({
      data: null,
      error: 'Each line needs a description.',
    })

    // ACT
    const result = await createRecurringInvoice(TENANT, createTemplate())

    // ASSERT
    expect(result).toEqual({
      data: null,
      error: 'Each line needs a description.',
      status: 422,
      code: 'billing/recurring-invoice-invalid-lines',
    })
    expect(mocks.prisma.recurringInvoice.create).not.toHaveBeenCalled()
  })

  it('rejects an end date before its start date without writing a profile', async () => {
    // ARRANGE
    const startAt = NOW - 3_600
    const template = createTemplate({ startAt, endAt: startAt - 1 })

    // ACT
    const result = await createRecurringInvoice(TENANT, template)

    // ASSERT
    expect(result).toEqual({
      data: null,
      error: 'endAt must not be before startAt.',
      status: 422,
      code: 'validation/invalid-request',
    })
    expect(mocks.prisma.recurringInvoice.create).not.toHaveBeenCalled()
  })
})

describe('updateRecurringInvoice', () => {
  it('rejects updates to a stopped profile', async () => {
    // ARRANGE
    mocks.prisma.recurringInvoice.findFirst.mockResolvedValue(
      profileRow({ status: 'STOPPED', nextRunAt: null })
    )
    const update: RecurringInvoiceUpdateParams = {
      profileName: 'Harbour View retainer — revised',
    }

    // ACT
    const result = await updateRecurringInvoice(TENANT, PROFILE, update)

    // ASSERT
    expect(result).toEqual({
      data: null,
      error: 'This Recurring Invoice can no longer be changed.',
      status: 409,
      code: 'billing/recurring-invoice-invalid-state',
    })
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled()
  })

  it('rejects updates to an expired profile', async () => {
    // ARRANGE
    mocks.prisma.recurringInvoice.findFirst.mockResolvedValue(
      profileRow({ status: 'EXPIRED', nextRunAt: null })
    )
    const update: RecurringInvoiceUpdateParams = {
      profileName: 'Harbour View retainer — revised',
    }

    // ACT
    const result = await updateRecurringInvoice(TENANT, PROFILE, update)

    // ASSERT
    expect(result).toEqual({
      data: null,
      error: 'This Recurring Invoice can no longer be changed.',
      status: 409,
      code: 'billing/recurring-invoice-invalid-state',
    })
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled()
  })

  it('moves the next run to the new every-2-months anchor when the frequency changes', async () => {
    // ARRANGE
    mocks.prisma.recurringInvoice.findFirst.mockResolvedValue(profileRow())
    const update: RecurringInvoiceUpdateParams = {
      frequency: { intervalUnit: 'month', intervalCount: 2 },
    }

    // ACT
    const result = await updateRecurringInvoice(TENANT, PROFILE, update)

    // ASSERT
    expect(result.error).toBeNull()
    expect(mocks.prisma.recurringInvoice.update).toHaveBeenCalledTimes(1)
    expect(mocks.prisma.recurringInvoice.update).toHaveBeenCalledWith({
      where: { id: PROFILE },
      data: expect.objectContaining({
        intervalUnit: 'MONTH',
        intervalCount: 2,
        nextRunAt: SEP_15,
      }),
      include: { lines: true },
    })
    expect(result.data).toMatchObject({ nextRunAt: SEP_15 })
  })

  it('moves the next run to a future start date without back-filling skipped periods', async () => {
    // ARRANGE
    mocks.prisma.recurringInvoice.findFirst.mockResolvedValue(profileRow())
    const update: RecurringInvoiceUpdateParams = { startAt: SEP_10 }

    // ACT
    const result = await updateRecurringInvoice(TENANT, PROFILE, update)

    // ASSERT
    expect(result.error).toBeNull()
    expect(mocks.prisma.recurringInvoice.update).toHaveBeenCalledTimes(1)
    expect(mocks.prisma.recurringInvoice.update).toHaveBeenCalledWith({
      where: { id: PROFILE },
      data: expect.objectContaining({ startAt: SEP_10, nextRunAt: SEP_10 }),
      include: { lines: true },
    })
  })

  it('keeps the next run when only non-schedule fields change', async () => {
    // ARRANGE
    mocks.prisma.recurringInvoice.findFirst.mockResolvedValue(profileRow())
    const update: RecurringInvoiceUpdateParams = {
      profileName: 'Harbour View retainer — revised',
    }

    // ACT
    const result = await updateRecurringInvoice(TENANT, PROFILE, update)

    // ASSERT
    expect(result.error).toBeNull()
    expect(mocks.prisma.recurringInvoiceLine.deleteMany).toHaveBeenCalledTimes(
      1
    )
    expect(mocks.prisma.recurringInvoiceLine.deleteMany).toHaveBeenCalledWith({
      where: { recurringInvoiceId: PROFILE },
    })
    expect(mocks.prisma.recurringInvoice.update).toHaveBeenCalledTimes(1)
    expect(mocks.prisma.recurringInvoice.update).toHaveBeenCalledWith({
      where: { id: PROFILE },
      data: {
        profileName: 'Harbour View retainer — revised',
        customerId: CUSTOMER,
        currency: 'JMD',
        intervalUnit: 'MONTH',
        intervalCount: 1,
        startAt: JAN_15,
        endAt: null,
        maxCycles: null,
        generationMode: 'FINALIZE',
        paymentTermId: null,
        salespersonId: null,
        priceListId: null,
        taxBehavior: 'EXCLUSIVE',
        notes: null,
        terms: null,
        subtotalAmount: 4_500_000n,
        discountAmount: 0n,
        taxAmount: 675_000n,
        totalAmount: 5_175_000n,
        updatedAt: NOW,
        nextRunAt: SEP_15,
        lines: {
          create: [
            {
              id: 'rinvl_test_1',
              itemId: null,
              variantId: null,
              priceId: null,
              description: LINE_DESCRIPTION,
              quantity: 1,
              unitAmount: 4_500_000n,
              taxAmount: 675_000n,
              discountAmount: 0n,
              position: 0,
              createdAt: NOW,
              updatedAt: NOW,
            },
          ],
        },
      },
      include: { lines: true },
    })
  })
})

describe('transitionRecurringInvoice', () => {
  it('pauses an active profile', async () => {
    // ARRANGE
    mocks.prisma.recurringInvoice.findFirst.mockResolvedValue(profileRow())

    // ACT
    const result = await transitionRecurringInvoice(TENANT, PROFILE, 'pause')

    // ASSERT
    expect(result.error).toBeNull()
    expect(mocks.prisma.recurringInvoice.update).toHaveBeenCalledTimes(1)
    expect(mocks.prisma.recurringInvoice.update).toHaveBeenCalledWith({
      where: { id: PROFILE },
      data: { status: 'PAUSED', updatedAt: NOW },
      include: { lines: true },
    })
    expect(result.data).toMatchObject({ status: 'PAUSED' })
  })

  it('rejects pausing a profile that is not active', async () => {
    // ARRANGE
    mocks.prisma.recurringInvoice.findFirst.mockResolvedValue(
      profileRow({ status: 'PAUSED' })
    )

    // ACT
    const result = await transitionRecurringInvoice(TENANT, PROFILE, 'pause')

    // ASSERT
    expect(result).toEqual({
      data: null,
      error: 'Only an active Recurring Invoice can be paused.',
      status: 409,
      code: 'billing/recurring-invoice-invalid-state',
    })
    expect(mocks.prisma.recurringInvoice.update).not.toHaveBeenCalled()
  })

  it('resumes a paused profile on the next anchored occurrence without generating skipped months', async () => {
    // ARRANGE
    mocks.prisma.recurringInvoice.findFirst.mockResolvedValue(
      profileRow({ status: 'PAUSED', lastRunAt: JUN_15, nextRunAt: JUL_15 })
    )

    // ACT
    const result = await transitionRecurringInvoice(TENANT, PROFILE, 'resume')

    // ASSERT
    expect(result.error).toBeNull()
    expect(mocks.prisma.recurringInvoice.update).toHaveBeenCalledTimes(1)
    expect(mocks.prisma.recurringInvoice.update).toHaveBeenCalledWith({
      where: { id: PROFILE },
      data: { status: 'ACTIVE', nextRunAt: SEP_15, updatedAt: NOW },
      include: { lines: true },
    })
  })

  it('expires a resumed profile whose schedule is exhausted', async () => {
    // ARRANGE
    mocks.prisma.recurringInvoice.findFirst.mockResolvedValue(
      profileRow({
        status: 'PAUSED',
        generatedCount: 3,
        maxCycles: 3,
        lastRunAt: AUG_15,
        nextRunAt: AUG_15,
      })
    )

    // ACT
    const result = await transitionRecurringInvoice(TENANT, PROFILE, 'resume')

    // ASSERT
    expect(result.error).toBeNull()
    expect(mocks.prisma.recurringInvoice.update).toHaveBeenCalledTimes(1)
    expect(mocks.prisma.recurringInvoice.update).toHaveBeenCalledWith({
      where: { id: PROFILE },
      data: { status: 'EXPIRED', nextRunAt: null, updatedAt: NOW },
      include: { lines: true },
    })
  })

  it('stops an active profile and clears its next run', async () => {
    // ARRANGE
    mocks.prisma.recurringInvoice.findFirst.mockResolvedValue(profileRow())

    // ACT
    const result = await transitionRecurringInvoice(TENANT, PROFILE, 'stop')

    // ASSERT
    expect(result.error).toBeNull()
    expect(mocks.prisma.recurringInvoice.update).toHaveBeenCalledTimes(1)
    expect(mocks.prisma.recurringInvoice.update).toHaveBeenCalledWith({
      where: { id: PROFILE },
      data: { status: 'STOPPED', nextRunAt: null, updatedAt: NOW },
      include: { lines: true },
    })
  })

  it('rejects stopping a profile that already ended', async () => {
    // ARRANGE
    mocks.prisma.recurringInvoice.findFirst.mockResolvedValue(
      profileRow({ status: 'STOPPED', nextRunAt: null })
    )

    // ACT
    const result = await transitionRecurringInvoice(TENANT, PROFILE, 'stop')

    // ASSERT
    expect(result).toEqual({
      data: null,
      error: 'This Recurring Invoice has already ended.',
      status: 409,
      code: 'billing/recurring-invoice-invalid-state',
    })
    expect(mocks.prisma.recurringInvoice.update).not.toHaveBeenCalled()
  })

  it('rejects resuming a profile that is not paused', async () => {
    // ARRANGE
    mocks.prisma.recurringInvoice.findFirst.mockResolvedValue(profileRow())

    // ACT
    const result = await transitionRecurringInvoice(TENANT, PROFILE, 'resume')

    // ASSERT
    expect(result).toEqual({
      data: null,
      error: 'Only a paused Recurring Invoice can be resumed.',
      status: 409,
      code: 'billing/recurring-invoice-invalid-state',
    })
    expect(mocks.prisma.recurringInvoice.update).not.toHaveBeenCalled()
  })
})

describe('deleteRecurringInvoice', () => {
  it('rejects deleting a profile that already generated invoices', async () => {
    // ARRANGE
    mocks.prisma.recurringInvoice.findFirst.mockResolvedValue(
      profileRow({ generatedCount: 1 })
    )

    // ACT
    const result = await deleteRecurringInvoice(TENANT, PROFILE)

    // ASSERT
    expect(result).toEqual({
      data: null,
      error:
        'A Recurring Invoice that has generated invoices cannot be deleted. Stop it instead.',
      status: 409,
      code: 'billing/recurring-invoice-delete-not-allowed',
    })
    expect(mocks.prisma.recurringInvoice.update).not.toHaveBeenCalled()
    expect(mocks.prisma.recurringInvoice.delete).not.toHaveBeenCalled()
  })

  it('soft-deletes a fresh profile instead of hard-deleting it', async () => {
    // ARRANGE
    mocks.prisma.recurringInvoice.findFirst.mockResolvedValue(
      profileRow({ generatedCount: 0 })
    )

    // ACT
    const result = await deleteRecurringInvoice(TENANT, PROFILE)

    // ASSERT
    expect(result).toEqual({ data: { id: PROFILE }, error: null })
    expect(mocks.prisma.recurringInvoice.update).toHaveBeenCalledTimes(1)
    expect(mocks.prisma.recurringInvoice.update).toHaveBeenCalledWith({
      where: { id: PROFILE },
      data: {
        status: 'STOPPED',
        nextRunAt: null,
        deletedAt: NOW,
        deletionReason: 'user-request',
        updatedAt: NOW,
      },
    })
    expect(mocks.prisma.recurringInvoice.delete).not.toHaveBeenCalled()
  })
})

describe('generateDueRecurringInvoice', () => {
  it('skips a profile that is not active', async () => {
    // ARRANGE
    const tx = generationTx(
      generationProfile({ status: 'PAUSED', nextRunAt: null })
    )

    // ACT
    const result = await generateDueRecurringInvoice(TENANT, PROFILE, AUG_20, {
      transaction: tx as unknown as Prisma.TransactionClient,
    })

    // ASSERT
    expect(result).toEqual({ status: 'skipped' })
    expect(tx.recurringInvoiceRun.create).not.toHaveBeenCalled()
    expect(mocks.invoiceCreate).not.toHaveBeenCalled()
  })

  it('skips a profile whose next run is in the future', async () => {
    // ARRANGE
    const tx = generationTx(generationProfile({ nextRunAt: NOW + 3_600 }))

    // ACT
    const result = await generateDueRecurringInvoice(TENANT, PROFILE, NOW, {
      transaction: tx as unknown as Prisma.TransactionClient,
    })

    // ASSERT
    expect(result).toEqual({ status: 'skipped' })
    expect(tx.recurringInvoiceRun.create).not.toHaveBeenCalled()
    expect(mocks.invoiceCreate).not.toHaveBeenCalled()
  })

  it('skips a run that already succeeded and returns its invoice', async () => {
    // ARRANGE
    const tx = generationTx(generationProfile())
    tx.recurringInvoiceRun.findUnique.mockResolvedValue({
      id: 'rrun_old_1',
      status: 'SUCCEEDED',
      invoiceId: 'inv_old_1',
    })

    // ACT
    const result = await generateDueRecurringInvoice(TENANT, PROFILE, AUG_20, {
      transaction: tx as unknown as Prisma.TransactionClient,
    })

    // ASSERT
    expect(result).toEqual({ status: 'skipped', invoiceId: 'inv_old_1' })
    expect(tx.recurringInvoiceRun.create).not.toHaveBeenCalled()
    expect(mocks.invoiceCreate).not.toHaveBeenCalled()
  })

  it('generates a draft invoice dated at the scheduled run without finalizing', async () => {
    // ARRANGE
    const profile = generationProfile()
    const tx = generationTx(profile)

    // ACT
    const result = await generateDueRecurringInvoice(TENANT, PROFILE, AUG_20, {
      transaction: tx as unknown as Prisma.TransactionClient,
    })

    // ASSERT
    expect(result).toEqual({ status: 'succeeded', invoiceId: 'inv_test_1' })
    expect(tx.recurringInvoiceRun.create).toHaveBeenCalledTimes(1)
    expect(tx.recurringInvoiceRun.create).toHaveBeenCalledWith({
      data: {
        id: 'rrun_test_1',
        tenantId: TENANT,
        recurringInvoiceId: PROFILE,
        scheduledFor: AUG_15,
        status: 'PROCESSING',
        attemptCount: 1,
        startedAt: NOW,
        createdAt: NOW,
        updatedAt: NOW,
      },
    })
    expect(mocks.invoiceCreate).toHaveBeenCalledTimes(1)
    expect(mocks.invoiceCreate).toHaveBeenCalledWith(
      TENANT,
      {
        customerId: CUSTOMER,
        currency: 'JMD',
        issueAt: AUG_15,
        salespersonId: null,
        priceListId: null,
        taxBehavior: 'EXCLUSIVE',
        notes: null,
        terms: null,
        discountAmount: 0n,
        lines: [
          {
            itemId: null,
            variantId: null,
            priceId: null,
            description: LINE_DESCRIPTION,
            quantity: 1,
            unitAmount: 4_500_000n,
            taxAmount: 675_000n,
            discountAmount: 0n,
          },
        ],
      },
      undefined,
      {
        recurringInvoiceId: PROFILE,
        transaction: tx,
      }
    )
    expect(mocks.finalizeInvoice).not.toHaveBeenCalled()
    expect(tx.invoice.update).not.toHaveBeenCalled()
    expect(tx.recurringInvoice.update).toHaveBeenCalledTimes(1)
    expect(tx.recurringInvoice.update).toHaveBeenCalledWith({
      where: { id: PROFILE },
      data: {
        generatedCount: 3,
        lastRunAt: AUG_15,
        nextRunAt: SEP_15,
        status: 'ACTIVE',
        updatedAt: NOW,
      },
    })
    expect(tx.recurringInvoiceRun.update).toHaveBeenCalledTimes(1)
    expect(tx.recurringInvoiceRun.update).toHaveBeenCalledWith({
      where: { id: 'rrun_test_1' },
      data: {
        status: 'SUCCEEDED',
        invoiceId: 'inv_test_1',
        completedAt: NOW,
        updatedAt: NOW,
      },
    })
  })

  it('finalizes the draft exactly once in finalize mode', async () => {
    // ARRANGE
    const tx = generationTx(generationProfile({ generationMode: 'FINALIZE' }))

    // ACT
    const result = await generateDueRecurringInvoice(TENANT, PROFILE, AUG_20, {
      transaction: tx as unknown as Prisma.TransactionClient,
    })

    // ASSERT
    expect(result).toEqual({ status: 'succeeded', invoiceId: 'inv_test_1' })
    expect(mocks.finalizeInvoice).toHaveBeenCalledTimes(1)
    expect(mocks.finalizeInvoice).toHaveBeenCalledWith(
      tx,
      TENANT,
      'inv_test_1',
      { paymentTermId: null, salespersonId: null, autoApplyCredits: false },
      NOW
    )
    expect(mocks.findInvoiceForSend).not.toHaveBeenCalled()
    expect(mocks.markInvoiceSent).not.toHaveBeenCalled()
  })

  it('marks the invoice sent in finalize-and-send mode', async () => {
    // ARRANGE
    const tx = generationTx(
      generationProfile({ generationMode: 'FINALIZE_AND_SEND' })
    )

    // ACT
    const result = await generateDueRecurringInvoice(TENANT, PROFILE, AUG_20, {
      transaction: tx as unknown as Prisma.TransactionClient,
    })

    // ASSERT
    expect(result).toEqual({ status: 'succeeded', invoiceId: 'inv_test_1' })
    expect(mocks.finalizeInvoice).toHaveBeenCalledTimes(1)
    expect(mocks.findInvoiceForSend).toHaveBeenCalledTimes(1)
    expect(mocks.findInvoiceForSend).toHaveBeenCalledWith(
      tx,
      TENANT,
      'inv_test_1'
    )
    expect(mocks.markInvoiceSent).toHaveBeenCalledTimes(1)
    expect(mocks.markInvoiceSent).toHaveBeenCalledWith(tx, {
      id: 'inv_test_1',
      status: 'OPEN',
      sentAt: null,
      now: NOW,
    })
  })

  it('stamps the profile payment term onto the generated draft', async () => {
    // ARRANGE
    const tx = generationTx(
      generationProfile({ paymentTermId: 'pterm_net30_01' })
    )
    tx.paymentTerm.findFirst.mockResolvedValue({
      id: 'pterm_net30_01',
      name: 'Net 30',
    })

    // ACT
    const result = await generateDueRecurringInvoice(TENANT, PROFILE, AUG_20, {
      transaction: tx as unknown as Prisma.TransactionClient,
    })

    // ASSERT
    expect(result).toEqual({ status: 'succeeded', invoiceId: 'inv_test_1' })
    expect(tx.invoice.update).toHaveBeenCalledTimes(1)
    expect(tx.invoice.update).toHaveBeenCalledWith({
      where: { id: 'inv_test_1' },
      data: { paymentTermId: 'pterm_net30_01', paymentTermName: 'Net 30' },
    })
  })

  it('advances an every-2-months schedule with the anchor helper', async () => {
    // ARRANGE
    const tx = generationTx(
      generationProfile({
        startAt: JUL_15,
        intervalCount: 2,
        nextRunAt: SEP_15,
        lastRunAt: JUL_15,
        generatedCount: 0,
      })
    )

    // ACT
    const result = await generateDueRecurringInvoice(TENANT, PROFILE, SEP_15, {
      transaction: tx as unknown as Prisma.TransactionClient,
    })

    // ASSERT
    expect(result).toEqual({ status: 'succeeded', invoiceId: 'inv_test_1' })
    expect(tx.recurringInvoice.update).toHaveBeenCalledWith({
      where: { id: PROFILE },
      data: {
        generatedCount: 1,
        lastRunAt: SEP_15,
        nextRunAt: NOV_15,
        status: 'ACTIVE',
        updatedAt: NOW,
      },
    })
  })

  it('expires the profile when the run reaches maxCycles', async () => {
    // ARRANGE
    const tx = generationTx(
      generationProfile({ generatedCount: 2, maxCycles: 3 })
    )

    // ACT
    const result = await generateDueRecurringInvoice(TENANT, PROFILE, AUG_20, {
      transaction: tx as unknown as Prisma.TransactionClient,
    })

    // ASSERT
    expect(result).toEqual({ status: 'succeeded', invoiceId: 'inv_test_1' })
    expect(tx.recurringInvoice.update).toHaveBeenCalledWith({
      where: { id: PROFILE },
      data: {
        generatedCount: 3,
        lastRunAt: AUG_15,
        nextRunAt: null,
        status: 'EXPIRED',
        updatedAt: NOW,
      },
    })
  })

  it('expires the profile when the next run passes endAt', async () => {
    // ARRANGE
    const tx = generationTx(generationProfile({ endAt: AUG_15 }))

    // ACT
    const result = await generateDueRecurringInvoice(TENANT, PROFILE, AUG_20, {
      transaction: tx as unknown as Prisma.TransactionClient,
    })

    // ASSERT
    expect(result).toEqual({ status: 'succeeded', invoiceId: 'inv_test_1' })
    expect(tx.recurringInvoice.update).toHaveBeenCalledWith({
      where: { id: PROFILE },
      data: {
        generatedCount: 3,
        lastRunAt: AUG_15,
        nextRunAt: null,
        status: 'EXPIRED',
        updatedAt: NOW,
      },
    })
  })

  it('fails the run without an invoice when the customer is inactive', async () => {
    // ARRANGE
    const tx = generationTx(generationProfile())
    tx.customer.findFirst.mockResolvedValue(null)

    // ACT
    const result = await generateDueRecurringInvoice(TENANT, PROFILE, AUG_20, {
      transaction: tx as unknown as Prisma.TransactionClient,
    })

    // ASSERT
    expect(result).toEqual({
      status: 'failed',
      code: 'billing/recurring-invoice-customer-not-found',
      message: 'The recurring invoice customer is unavailable.',
    })
    expect(tx.recurringInvoiceRun.update).toHaveBeenCalledTimes(1)
    expect(tx.recurringInvoiceRun.update).toHaveBeenCalledWith({
      where: { id: 'rrun_test_1' },
      data: {
        status: 'FAILED',
        errorCode: 'billing/recurring-invoice-customer-not-found',
        errorMessage: 'The recurring invoice customer is unavailable.',
        completedAt: NOW,
        updatedAt: NOW,
      },
    })
    expect(mocks.invoiceCreate).not.toHaveBeenCalled()
    expect(tx.recurringInvoice.update).not.toHaveBeenCalled()
  })

  it('fails the run without an invoice when the currency is disabled', async () => {
    // ARRANGE
    const tx = generationTx(generationProfile())
    mocks.hasEnabledCurrency.mockResolvedValue(false)

    // ACT
    const result = await generateDueRecurringInvoice(TENANT, PROFILE, AUG_20, {
      transaction: tx as unknown as Prisma.TransactionClient,
    })

    // ASSERT
    expect(result).toEqual({
      status: 'failed',
      code: 'billing/recurring-invoice-currency-disabled',
      message: 'The recurring invoice currency is disabled.',
    })
    expect(tx.recurringInvoiceRun.update).toHaveBeenCalledWith({
      where: { id: 'rrun_test_1' },
      data: {
        status: 'FAILED',
        errorCode: 'billing/recurring-invoice-currency-disabled',
        errorMessage: 'The recurring invoice currency is disabled.',
        completedAt: NOW,
        updatedAt: NOW,
      },
    })
    expect(mocks.invoiceCreate).not.toHaveBeenCalled()
    expect(tx.recurringInvoice.update).not.toHaveBeenCalled()
  })

  it('throws when finalization fails so the claim transaction rolls back', async () => {
    // ARRANGE
    const tx = generationTx(generationProfile({ generationMode: 'FINALIZE' }))
    mocks.finalizeInvoice.mockResolvedValue({
      data: null,
      error: 'Item stock changed.',
      status: 409,
    })

    // ACT
    const outcome = generateDueRecurringInvoice(TENANT, PROFILE, AUG_20, {
      transaction: tx as unknown as Prisma.TransactionClient,
    })

    // ASSERT
    await expect(outcome).rejects.toThrow(
      'Recurring invoice finalize failed: Item stock changed.'
    )
    expect(tx.recurringInvoiceRun.update).not.toHaveBeenCalled()
    expect(tx.recurringInvoice.update).not.toHaveBeenCalled()
  })
})

describe('recordRecurringInvoiceFailure', () => {
  it('upserts a failed run for the profile current next run', async () => {
    // ARRANGE
    mocks.prisma.recurringInvoice.findFirst.mockResolvedValue({
      nextRunAt: AUG_15,
    })

    // ACT
    await recordRecurringInvoiceFailure(
      TENANT,
      PROFILE,
      NOW,
      new Error('claim exploded')
    )

    // ASSERT
    expect(mocks.prisma.recurringInvoiceRun.upsert).toHaveBeenCalledTimes(1)
    expect(mocks.prisma.recurringInvoiceRun.upsert).toHaveBeenCalledWith({
      where: {
        recurringInvoiceId_scheduledFor: {
          recurringInvoiceId: PROFILE,
          scheduledFor: AUG_15,
        },
      },
      create: {
        id: 'rrun_test_1',
        tenantId: TENANT,
        recurringInvoiceId: PROFILE,
        scheduledFor: AUG_15,
        status: 'FAILED',
        attemptCount: 1,
        errorCode: 'internal/error',
        errorMessage: 'claim exploded',
        startedAt: NOW,
        completedAt: NOW,
        createdAt: NOW,
        updatedAt: NOW,
      },
      update: {
        status: 'FAILED',
        attemptCount: { increment: 1 },
        errorCode: 'internal/error',
        errorMessage: 'claim exploded',
        completedAt: NOW,
        updatedAt: NOW,
      },
    })
  })

  it('does nothing when the profile has no next run', async () => {
    // ARRANGE
    mocks.prisma.recurringInvoice.findFirst.mockResolvedValue({
      nextRunAt: null,
    })

    // ACT
    await recordRecurringInvoiceFailure(
      TENANT,
      PROFILE,
      NOW,
      new Error('claim exploded')
    )

    // ASSERT
    expect(mocks.prisma.recurringInvoiceRun.upsert).not.toHaveBeenCalled()
  })
})

describe('recurring invoice billing reason', () => {
  it('marks an invoice created for a recurring profile as a recurring invoice', async () => {
    // ARRANGE
    const tx = invoiceTx()

    // ACT
    const result = await mocks.realInvoiceCreate(
      TENANT,
      invoiceParams(),
      undefined,
      {
        recurringInvoiceId: PROFILE,
        transaction: tx as unknown as Prisma.TransactionClient,
      }
    )

    // ASSERT
    expect(result).toEqual({ data: { id: 'inv_test_9' }, error: null })
    expect(tx.invoice.create).toHaveBeenCalledTimes(1)
    expect(tx.invoice.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        billingReason: 'RECURRING_INVOICE',
        recurringInvoiceId: PROFILE,
      }),
    })
  })

  it('marks an invoice created without a recurring profile as manual', async () => {
    // ARRANGE
    const tx = invoiceTx()

    // ACT
    const result = await mocks.realInvoiceCreate(
      TENANT,
      invoiceParams(),
      undefined,
      {
        transaction: tx as unknown as Prisma.TransactionClient,
      }
    )

    // ASSERT
    expect(result).toEqual({ data: { id: 'inv_test_9' }, error: null })
    expect(tx.invoice.create).toHaveBeenCalledTimes(1)
    expect(tx.invoice.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        billingReason: 'MANUAL',
        recurringInvoiceId: null,
      }),
    })
  })
})
