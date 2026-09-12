import { calculateDocumentTotals } from '@876/core/money'
import { nowUnixSeconds } from '@876/core/timestamps'

import type { Prisma } from '@/db'
import { prisma } from '@/db/client'
import { hasEnabledCurrency } from '@/modules/currencies'
import { generateId } from '@/platform/ids'

import type { ServiceResult } from '../schemas/api'
import type {
  RecurringInvoiceCreateParams,
  RecurringInvoiceFromInvoiceParams,
  RecurringInvoiceStatus,
  RecurringInvoiceUpdateParams,
} from '../schemas/recurring-invoice'
import type { RecurringInvoiceRow } from '../recurring-invoices.serializers'
import { finalizeInvoiceInTransaction } from '../workflows/finalize-invoice'
import { buildDocumentLines } from './documents/lines'
import { findInvoiceForSend, markInvoiceSent } from './invoice-workflow'
import { invoices } from './invoices'
import {
  isRecurringScheduleExhausted,
  nextRecurringRunAfter,
} from './recurring-invoice-schedule'
import { err, ok } from './result'

/** Recurring profiles per workspace are few; lists are bounded, not paged. */
const LIST_LIMIT = 200
const RECENT_START_WINDOW = 86_400

const dbStatus = {
  active: 'ACTIVE',
  paused: 'PAUSED',
  stopped: 'STOPPED',
  expired: 'EXPIRED',
} as const
const dbMode = {
  draft: 'DRAFT',
  finalize: 'FINALIZE',
  'finalize-and-send': 'FINALIZE_AND_SEND',
} as const
const dbUnit = {
  day: 'DAY',
  week: 'WEEK',
  month: 'MONTH',
  year: 'YEAR',
} as const
const apiUnit = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  YEAR: 'year',
} as const
const apiMode = {
  DRAFT: 'draft',
  FINALIZE: 'finalize',
  FINALIZE_AND_SEND: 'finalize-and-send',
} as const

type Template = RecurringInvoiceCreateParams
type PreparedTemplate = {
  discountAmount: bigint
  totals: { subtotalAmount: bigint; taxAmount: bigint; totalAmount: bigint }
}

const NOT_FOUND = [
  'Recurring Invoice not found.',
  404,
  'billing/recurring-invoice-not-found',
] as const

async function prepareTemplate(
  tenantId: string,
  template: Template
): ServiceResult<PreparedTemplate> {
  if (template.endAt != null && template.endAt < template.startAt)
    return err(
      'endAt must not be before startAt.',
      422,
      'validation/invalid-request'
    )
  if (!(await hasEnabledCurrency(tenantId, template.currency)))
    return err(
      'Enable the recurring invoice currency before using it.',
      422,
      'billing/recurring-invoice-currency-disabled'
    )
  const customer = await prisma.customer.findFirst({
    where: { id: template.customerId, tenantId, status: 'ACTIVE' },
    select: { id: true },
  })
  if (!customer)
    return err(
      'The selected customer was not found.',
      404,
      'billing/recurring-invoice-customer-not-found'
    )

  const prepared = template.priceListId
    ? await buildDocumentLines(
        tenantId,
        template.currency,
        template.lines,
        template.priceListId
      )
    : await buildDocumentLines(tenantId, template.currency, template.lines)
  if (prepared.error !== null)
    return err(prepared.error, 422, 'billing/recurring-invoice-invalid-lines')

  const discountAmount = template.discountAmount ?? 0n
  const totals = calculateDocumentTotals({
    lines: prepared.data.lineAmounts,
    discountAmount,
    shippingAmount: 0n,
    adjustmentAmount: 0n,
  })
  if (totals.error !== null)
    return err(
      totals.error.message,
      422,
      'billing/recurring-invoice-invalid-lines'
    )

  return ok({ discountAmount, totals: totals.data })
}

function lineData(lines: Template['lines'], now: number) {
  return lines.map((line, position) => ({
    id: generateId('RecurringInvoiceLine'),
    itemId: line.itemId ?? null,
    variantId: line.variantId ?? null,
    priceId: line.priceId ?? null,
    description: line.description ?? null,
    quantity: line.quantity,
    unitAmount: line.unitAmount ?? null,
    taxAmount: line.taxAmount ?? 0n,
    discountAmount: line.discountAmount ?? 0n,
    position,
    createdAt: now,
    updatedAt: now,
  }))
}

function dataFromTemplate(
  template: Template,
  prepared: PreparedTemplate,
  now: number
) {
  return {
    profileName: template.profileName,
    customerId: template.customerId,
    currency: template.currency,
    intervalUnit: dbUnit[template.frequency.intervalUnit],
    intervalCount: template.frequency.intervalCount,
    startAt: template.startAt,
    endAt: template.endAt ?? null,
    maxCycles: template.maxCycles ?? null,
    generationMode: dbMode[template.generationMode],
    paymentTermId: template.paymentTermId ?? null,
    salespersonId: template.salespersonId ?? null,
    priceListId: template.priceListId ?? null,
    taxBehavior: template.taxBehavior ?? 'EXCLUSIVE',
    notes: template.notes ?? null,
    terms: template.terms ?? null,
    subtotalAmount: prepared.totals.subtotalAmount,
    discountAmount: prepared.discountAmount,
    taxAmount: prepared.totals.taxAmount,
    totalAmount: prepared.totals.totalAmount,
    updatedAt: now,
  }
}

function scheduleOf(template: Template) {
  return {
    startAt: template.startAt,
    intervalUnit: dbUnit[template.frequency.intervalUnit],
    intervalCount: template.frequency.intervalCount,
  }
}

export async function createRecurringInvoice(
  tenantId: string,
  template: Template
): ServiceResult<RecurringInvoiceRow> {
  const prepared = await prepareTemplate(tenantId, template)
  if (prepared.error !== null) return prepared

  const now = nowUnixSeconds()
  const row = await prisma.recurringInvoice.create({
    data: {
      id: generateId('RecurringInvoice'),
      tenantId,
      status: 'ACTIVE',
      generatedCount: 0,
      lastRunAt: null,
      // A start date within the last day (a date picker sends midnight) runs
      // on that date; an older one begins on the next anchored occurrence and
      // never back-fills periods from before the profile existed.
      nextRunAt:
        template.startAt >= now - RECENT_START_WINDOW
          ? template.startAt
          : nextRecurringRunAfter(scheduleOf(template), now - 1),
      createdAt: now,
      ...dataFromTemplate(template, prepared.data, now),
      lines: { create: lineData(template.lines, now) },
    },
    include: { lines: true },
  })
  return ok(row)
}

/**
 * Starts a profile from an existing invoice. The document fields come from the
 * invoice's own line snapshots and header; only the schedule is supplied by the
 * caller. Creation goes through the same path as a directly created profile, so
 * currency, customer and line validation are identical.
 */
export async function createRecurringInvoiceFromInvoice(
  tenantId: string,
  invoiceId: string,
  schedule: RecurringInvoiceFromInvoiceParams,
  sourceAppId?: string
): ServiceResult<RecurringInvoiceRow> {
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      tenantId,
      ...(sourceAppId ? { sourceAppId } : {}),
    },
    include: { lines: { orderBy: { position: 'asc' } } },
  })
  if (!invoice) return err('Invoice not found.', 404)

  return createRecurringInvoice(tenantId, {
    ...schedule,
    customerId: invoice.customerId,
    currency: invoice.currency,
    paymentTermId: invoice.paymentTermId,
    salespersonId: invoice.salespersonId,
    priceListId: invoice.priceListId,
    taxBehavior: invoice.taxBehavior,
    notes: invoice.notes,
    terms: invoice.terms,
    discountAmount: invoice.discountAmount,
    lines: invoice.lines.map((line) => ({
      itemId: line.itemId,
      variantId: line.variantId,
      priceId: line.priceId,
      description: line.description,
      quantity: line.quantity,
      unitAmount: line.unitAmount,
      taxAmount: line.taxAmount,
      discountAmount: line.discountAmount,
    })),
  })
}

export function listRecurringInvoices(
  tenantId: string,
  status?: RecurringInvoiceStatus,
  customerId?: string
) {
  return prisma.recurringInvoice.findMany({
    where: {
      tenantId,
      deletedAt: null,
      ...(status ? { status: dbStatus[status] } : {}),
      ...(customerId ? { customerId } : {}),
    },
    include: { lines: true },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: LIST_LIMIT,
  })
}

export function retrieveRecurringInvoice(tenantId: string, id: string) {
  return prisma.recurringInvoice.findFirst({
    where: { tenantId, id, deletedAt: null },
    include: { lines: true },
  })
}

export async function updateRecurringInvoice(
  tenantId: string,
  id: string,
  update: RecurringInvoiceUpdateParams
): ServiceResult<RecurringInvoiceRow> {
  const current = await retrieveRecurringInvoice(tenantId, id)
  if (!current) return err(...NOT_FOUND)
  if (current.status === 'STOPPED' || current.status === 'EXPIRED')
    return err(
      'This Recurring Invoice can no longer be changed.',
      409,
      'billing/recurring-invoice-invalid-state'
    )

  const template: Template = {
    profileName: update.profileName ?? current.profileName,
    customerId: update.customerId ?? current.customerId,
    currency: update.currency ?? current.currency,
    frequency: update.frequency ?? {
      intervalUnit: apiUnit[current.intervalUnit],
      intervalCount: current.intervalCount,
    },
    startAt: update.startAt ?? current.startAt,
    endAt: update.endAt === undefined ? current.endAt : update.endAt,
    maxCycles:
      update.maxCycles === undefined ? current.maxCycles : update.maxCycles,
    generationMode: update.generationMode ?? apiMode[current.generationMode],
    paymentTermId:
      update.paymentTermId === undefined
        ? current.paymentTermId
        : update.paymentTermId,
    salespersonId:
      update.salespersonId === undefined
        ? current.salespersonId
        : update.salespersonId,
    priceListId:
      update.priceListId === undefined
        ? current.priceListId
        : update.priceListId,
    taxBehavior: update.taxBehavior ?? current.taxBehavior,
    notes: update.notes === undefined ? current.notes : update.notes,
    terms: update.terms === undefined ? current.terms : update.terms,
    discountAmount: update.discountAmount ?? current.discountAmount,
    lines:
      update.lines ??
      current.lines
        .toSorted((left, right) => left.position - right.position)
        .map((line) => ({
          itemId: line.itemId,
          variantId: line.variantId,
          priceId: line.priceId,
          description: line.description,
          quantity: line.quantity,
          unitAmount: line.unitAmount,
          taxAmount: line.taxAmount,
          discountAmount: line.discountAmount,
        })),
  }
  const prepared = await prepareTemplate(tenantId, template)
  if (prepared.error !== null) return prepared

  const now = nowUnixSeconds()
  const scheduleChanged =
    update.startAt !== undefined || update.frequency !== undefined
  // A schedule change moves the next run forward only: it never re-issues a
  // period that already ran or back-fills one that was skipped.
  const nextRunAt =
    scheduleChanged && current.status === 'ACTIVE'
      ? nextRecurringRunAfter(
          scheduleOf(template),
          Math.max(now - 1, current.lastRunAt ?? -1)
        )
      : current.nextRunAt

  const row = await prisma.$transaction(async (tx) => {
    await tx.recurringInvoiceLine.deleteMany({
      where: { recurringInvoiceId: id },
    })
    return tx.recurringInvoice.update({
      where: { id },
      data: {
        ...dataFromTemplate(template, prepared.data, now),
        nextRunAt,
        lines: { create: lineData(template.lines, now) },
      },
      include: { lines: true },
    })
  })
  return ok(row)
}

export async function transitionRecurringInvoice(
  tenantId: string,
  id: string,
  action: 'pause' | 'resume' | 'stop'
): ServiceResult<RecurringInvoiceRow> {
  const current = await retrieveRecurringInvoice(tenantId, id)
  if (!current) return err(...NOT_FOUND)

  const now = nowUnixSeconds()
  const invalid = (message: string) =>
    err(message, 409, 'billing/recurring-invoice-invalid-state')

  if (action === 'pause') {
    if (current.status !== 'ACTIVE')
      return invalid('Only an active Recurring Invoice can be paused.')
    return ok(
      await prisma.recurringInvoice.update({
        where: { id },
        data: { status: 'PAUSED', updatedAt: now },
        include: { lines: true },
      })
    )
  }

  if (action === 'resume') {
    if (current.status !== 'PAUSED')
      return invalid('Only a paused Recurring Invoice can be resumed.')
    const nextRunAt = nextRecurringRunAfter(
      current,
      Math.max(now - 1, current.lastRunAt ?? -1)
    )
    const exhausted = isRecurringScheduleExhausted(
      current,
      current.generatedCount,
      nextRunAt
    )
    return ok(
      await prisma.recurringInvoice.update({
        where: { id },
        data: {
          status: exhausted ? 'EXPIRED' : 'ACTIVE',
          nextRunAt: exhausted ? null : nextRunAt,
          updatedAt: now,
        },
        include: { lines: true },
      })
    )
  }

  if (current.status !== 'ACTIVE' && current.status !== 'PAUSED')
    return invalid('This Recurring Invoice has already ended.')
  return ok(
    await prisma.recurringInvoice.update({
      where: { id },
      data: { status: 'STOPPED', nextRunAt: null, updatedAt: now },
      include: { lines: true },
    })
  )
}

export async function deleteRecurringInvoice(
  tenantId: string,
  id: string
): ServiceResult<{ id: string }> {
  const current = await retrieveRecurringInvoice(tenantId, id)
  if (!current) return err(...NOT_FOUND)
  if (current.generatedCount > 0)
    return err(
      'A Recurring Invoice that has generated invoices cannot be deleted. Stop it instead.',
      409,
      'billing/recurring-invoice-delete-not-allowed'
    )

  const now = nowUnixSeconds()
  await prisma.recurringInvoice.update({
    where: { id },
    data: {
      status: 'STOPPED',
      nextRunAt: null,
      deletedAt: now,
      deletionReason: 'user-request',
      updatedAt: now,
    },
  })
  return ok({ id })
}

export function listRecurringInvoiceChildren(
  tenantId: string,
  recurringInvoiceId: string
) {
  return prisma.invoice.findMany({
    where: { tenantId, recurringInvoiceId },
    include: { customer: true, lines: true },
    orderBy: [{ issueAt: 'desc' }, { id: 'desc' }],
    take: LIST_LIMIT,
  })
}

type GenerationResult =
  | { status: 'skipped'; invoiceId?: string }
  | { status: 'failed'; code: string; message: string }
  | { status: 'succeeded'; invoiceId: string }

/**
 * Generates the invoice for one due run inside the sweep's claim transaction.
 * The `(recurringInvoiceId, scheduledFor)` run row makes a retry idempotent.
 * An expected failure is returned (the caller records it and moves on); it
 * never advances `nextRunAt`, so the run is retried by the next sweep.
 */
export async function generateDueRecurringInvoice(
  tenantId: string,
  id: string,
  asOf: number,
  options: { transaction: Prisma.TransactionClient }
): Promise<GenerationResult> {
  const tx = options.transaction
  const profile = await tx.recurringInvoice.findFirst({
    where: { tenantId, id, deletedAt: null },
    include: { lines: true },
  })
  if (
    !profile ||
    profile.status !== 'ACTIVE' ||
    profile.nextRunAt === null ||
    profile.nextRunAt > asOf
  )
    return { status: 'skipped' }

  const scheduledFor = profile.nextRunAt
  const existing = await tx.recurringInvoiceRun.findUnique({
    where: {
      recurringInvoiceId_scheduledFor: { recurringInvoiceId: id, scheduledFor },
    },
  })
  if (existing?.status === 'SUCCEEDED')
    return { status: 'skipped', invoiceId: existing.invoiceId ?? undefined }

  const now = nowUnixSeconds()
  const run = existing
    ? await tx.recurringInvoiceRun.update({
        where: { id: existing.id },
        data: {
          status: 'PROCESSING',
          attemptCount: { increment: 1 },
          errorCode: null,
          errorMessage: null,
          startedAt: now,
          updatedAt: now,
        },
      })
    : await tx.recurringInvoiceRun.create({
        data: {
          id: generateId('RecurringInvoiceRun'),
          tenantId,
          recurringInvoiceId: id,
          scheduledFor,
          status: 'PROCESSING',
          attemptCount: 1,
          startedAt: now,
          createdAt: now,
          updatedAt: now,
        },
      })
  const fail = async (code: string, message: string) => {
    await tx.recurringInvoiceRun.update({
      where: { id: run.id },
      data: {
        status: 'FAILED',
        errorCode: code,
        errorMessage: message,
        completedAt: now,
        updatedAt: now,
      },
    })
    return { status: 'failed' as const, code, message }
  }

  const customer = await tx.customer.findFirst({
    where: { id: profile.customerId, tenantId, status: 'ACTIVE' },
    select: { id: true },
  })
  if (!customer)
    return fail(
      'billing/recurring-invoice-customer-not-found',
      'The recurring invoice customer is unavailable.'
    )
  if (!(await hasEnabledCurrency(tenantId, profile.currency)))
    return fail(
      'billing/recurring-invoice-currency-disabled',
      'The recurring invoice currency is disabled.'
    )

  const created = await invoices.create(
    tenantId,
    {
      customerId: profile.customerId,
      currency: profile.currency,
      issueAt: scheduledFor,
      salespersonId: profile.salespersonId,
      priceListId: profile.priceListId,
      taxBehavior: profile.taxBehavior,
      notes: profile.notes,
      terms: profile.terms,
      discountAmount: profile.discountAmount,
      lines: profile.lines
        .toSorted((left, right) => left.position - right.position)
        .map((line) => ({
          itemId: line.itemId,
          variantId: line.variantId,
          priceId: line.priceId,
          description: line.description,
          quantity: line.quantity,
          unitAmount: line.unitAmount,
          taxAmount: line.taxAmount,
          discountAmount: line.discountAmount,
        })),
    },
    undefined,
    { recurringInvoiceId: id, transaction: tx }
  )
  if (created.error !== null)
    return fail(
      created.code ?? 'billing/recurring-invoice-invalid-lines',
      created.error
    )
  const invoiceId = created.data.id

  // Invoice create applies the customer's default term; the profile's own
  // term wins, and finalize reads it back from the draft.
  if (profile.paymentTermId) {
    const term = await tx.paymentTerm.findFirst({
      where: { id: profile.paymentTermId, tenantId, isActive: true },
      select: { id: true, name: true },
    })
    if (term)
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { paymentTermId: term.id, paymentTermName: term.name },
      })
  }

  if (profile.generationMode !== 'DRAFT') {
    const finalized = await finalizeInvoiceInTransaction(
      tx,
      tenantId,
      invoiceId,
      {
        paymentTermId: profile.paymentTermId,
        salespersonId: profile.salespersonId,
        autoApplyCredits: false,
      },
      now
    )
    // Finalization can fail after the draft row was written (e.g. stock);
    // throwing rolls the whole claim back so no orphan draft survives.
    if (finalized.error !== null)
      throw new Error(`Recurring invoice finalize failed: ${finalized.error}`)

    if (profile.generationMode === 'FINALIZE_AND_SEND') {
      const invoice = await findInvoiceForSend(tx, tenantId, invoiceId)
      const status = invoice?.status
      if (
        invoice &&
        (status === 'OPEN' ||
          status === 'SENT' ||
          status === 'PARTIALLY_PAID' ||
          status === 'OVERDUE' ||
          status === 'PAID')
      )
        await markInvoiceSent(tx, {
          id: invoice.id,
          status,
          sentAt: invoice.sentAt,
          now,
        })
    }
  }

  const generatedCount = profile.generatedCount + 1
  const nextRunAt = nextRecurringRunAfter(profile, scheduledFor)
  const exhausted = isRecurringScheduleExhausted(
    profile,
    generatedCount,
    nextRunAt
  )
  await tx.recurringInvoice.update({
    where: { id },
    data: {
      generatedCount,
      lastRunAt: scheduledFor,
      nextRunAt: exhausted ? null : nextRunAt,
      status: exhausted ? 'EXPIRED' : 'ACTIVE',
      updatedAt: now,
    },
  })
  await tx.recurringInvoiceRun.update({
    where: { id: run.id },
    data: { status: 'SUCCEEDED', invoiceId, completedAt: now, updatedAt: now },
  })
  return { status: 'succeeded', invoiceId }
}

/**
 * Records an unexpected generation failure after its transaction rolled back,
 * so the run is visible to operators instead of silently retrying.
 */
export async function recordRecurringInvoiceFailure(
  tenantId: string,
  id: string,
  asOf: number,
  error: unknown
): Promise<void> {
  const profile = await prisma.recurringInvoice.findFirst({
    where: { tenantId, id },
    select: { nextRunAt: true },
  })
  if (profile?.nextRunAt == null) return

  const message =
    error instanceof Error
      ? error.message.slice(0, 1_000)
      : 'Generation failed.'
  await prisma.recurringInvoiceRun.upsert({
    where: {
      recurringInvoiceId_scheduledFor: {
        recurringInvoiceId: id,
        scheduledFor: profile.nextRunAt,
      },
    },
    create: {
      id: generateId('RecurringInvoiceRun'),
      tenantId,
      recurringInvoiceId: id,
      scheduledFor: profile.nextRunAt,
      status: 'FAILED',
      attemptCount: 1,
      errorCode: 'internal/error',
      errorMessage: message,
      startedAt: asOf,
      completedAt: asOf,
      createdAt: asOf,
      updatedAt: asOf,
    },
    update: {
      status: 'FAILED',
      attemptCount: { increment: 1 },
      errorCode: 'internal/error',
      errorMessage: message,
      completedAt: asOf,
      updatedAt: asOf,
    },
  })
}
