import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import { generateId } from '@/lib/id'
import type { InvoiceCreateParams } from '@/types/invoice'
import type { ServiceResult } from '@/types/api'

import { buildDocumentLines } from '../documents/lines'
import { nextDocumentNumber } from '../documents/numbers'
import {
  attributionData,
  type AttributedCreateResult,
  type IntegrationAttribution,
  resolveIdempotencyReplay,
} from '../integrations/attribution'
import { err, ok } from '../result'
import { hasEnabledCurrency, isUniqueConstraintError } from '../shared'
import { resolveInvoiceDefaults } from './defaults'

/** Creates a draft invoice manually or by copying a quote snapshot. */
export async function create(
  tenantId: string,
  params: InvoiceCreateParams,
  attribution?: IntegrationAttribution
): ServiceResult<AttributedCreateResult> {
  const replay = attribution
    ? resolveIdempotencyReplay(
        await findByIdempotencyKey(tenantId, attribution),
        attribution
      )
    : null
  if (replay) return replay

  try {
    if (params.quoteId)
      return await createFromQuote(
        tenantId,
        params.quoteId,
        params,
        attribution
      )
    if (params.estimateId)
      return await createFromEstimate(
        tenantId,
        params.estimateId,
        params,
        attribution
      )

    return await createManualInvoice(tenantId, params, attribution)
  } catch (error) {
    if (isUniqueConstraintError(error) && attribution) {
      const replayAfterConflict = resolveIdempotencyReplay(
        await findByIdempotencyKey(tenantId, attribution),
        attribution
      )
      if (replayAfterConflict) return replayAfterConflict

      if (
        attribution.sourceExternalReference &&
        (await prisma.invoice.findFirst({
          where: {
            tenantId,
            sourceAppId: attribution.sourceAppId,
            sourceExternalReference: attribution.sourceExternalReference,
          },
          select: { id: true },
        }))
      )
        return err(
          'An invoice already exists for this source external reference.',
          409
        )

      return err('An invoice with these unique details already exists.', 409)
    }

    console.error('[billing.service.invoices.create]', error)
    return err('Failed to create the invoice.', 500)
  }
}

async function createFromQuote(
  tenantId: string,
  quoteId: string,
  params: InvoiceCreateParams,
  attribution?: IntegrationAttribution
): ServiceResult<AttributedCreateResult> {
  const [quote, salesperson] = await Promise.all([
    prisma.quote.findFirst({
      where: { id: quoteId, tenantId },
      include: { lines: true, convertedInvoice: { select: { id: true } } },
    }),
    resolveSalesperson(tenantId, params.salespersonId),
  ])
  if (!quote) return err('The selected quote was not found.', 404)
  if (params.salespersonId && !salesperson)
    return err('The selected salesperson was not found.', 404)
  if (quote.convertedInvoice)
    return err('This quote already has an invoice.', 409)
  if (quote.status === 'CANCELED' || quote.status === 'DECLINED')
    return err('This quote cannot be converted to an invoice.', 422)

  const defaults = await resolveInvoiceDefaults(tenantId, quote.customerId)
  if (!defaults) return err('Invoice defaults could not be resolved.', 409)

  const now = nowUnixSeconds()
  const number = await nextDocumentNumber(tenantId, 'INVOICE', now)
  const invoice = await prisma.$transaction(async (tx) => {
    return tx.invoice.create({
      data: {
        id: generateId('Invoice'),
        tenantId,
        ...attributionData(attribution),
        customerId: quote.customerId,
        quoteId: quote.id,
        priceListId: quote.priceListId,
        priceListName: quote.priceListName,
        salespersonId: salesperson?.id ?? null,
        number,
        status: 'DRAFT',
        billingReason: 'QUOTE',
        currency: quote.currency,
        issueAt: params.issueAt ?? now,
        dueAt: params.dueAt ?? null,
        subtotalAmount: quote.subtotalAmount,
        taxAmount: quote.taxAmount,
        totalAmount: quote.totalAmount,
        amountDue: quote.totalAmount,
        ...invoiceSnapshotData(defaults, params),
        notes: params.notes ?? quote.notes ?? defaults.notes,
        terms: params.terms ?? quote.terms ?? defaults.terms,
        createdAt: now,
        updatedAt: now,
        lines: {
          create: quote.lines.map((line, position) => ({
            id: generateId('InvoiceLine'),
            itemId: line.itemId,
            priceId: line.priceId,
            description: line.description,
            position,
            quantity: line.quantity,
            unitAmount: line.unitAmount,
            taxAmount: line.taxAmount,
            discountAmount: line.discountAmount,
            totalAmount: line.totalAmount,
            createdAt: now,
            updatedAt: now,
          })),
        },
      },
    })
  })

  return ok({ id: invoice.id })
}

async function createFromEstimate(
  tenantId: string,
  estimateId: string,
  params: InvoiceCreateParams,
  attribution?: IntegrationAttribution
): ServiceResult<AttributedCreateResult> {
  const [estimate, salesperson] = await Promise.all([
    prisma.estimate.findFirst({
      where: { id: estimateId, tenantId },
      include: { lines: true, convertedInvoice: { select: { id: true } } },
    }),
    resolveSalesperson(tenantId, params.salespersonId),
  ])
  if (!estimate) return err('The selected estimate was not found.', 404)
  if (params.salespersonId && !salesperson)
    return err('The selected salesperson was not found.', 404)
  if (estimate.convertedInvoice)
    return err('This estimate already has an invoice.', 409)
  if (estimate.status === 'CANCELED' || estimate.status === 'DECLINED')
    return err('This estimate cannot be converted to an invoice.', 422)

  const defaults = await resolveInvoiceDefaults(tenantId, estimate.customerId)
  if (!defaults) return err('Invoice defaults could not be resolved.', 409)

  const now = nowUnixSeconds()
  const number = await nextDocumentNumber(tenantId, 'INVOICE', now)
  const invoice = await prisma.$transaction((tx) =>
    tx.invoice.create({
      data: {
        id: generateId('Invoice'),
        tenantId,
        ...attributionData(attribution),
        customerId: estimate.customerId,
        estimateId: estimate.id,
        priceListId: estimate.priceListId,
        priceListName: estimate.priceListName,
        salespersonId: salesperson?.id ?? null,
        number,
        status: 'DRAFT',
        billingReason: 'ESTIMATE',
        currency: estimate.currency,
        issueAt: params.issueAt ?? now,
        dueAt: params.dueAt ?? null,
        subtotalAmount: estimate.subtotalAmount,
        taxAmount: estimate.taxAmount,
        totalAmount: estimate.totalAmount,
        amountDue: estimate.totalAmount,
        ...invoiceSnapshotData(defaults, params),
        notes: params.notes ?? estimate.notes ?? defaults.notes,
        terms: params.terms ?? estimate.terms ?? defaults.terms,
        createdAt: now,
        updatedAt: now,
        lines: {
          create: estimate.lines.map((line, position) => ({
            id: generateId('InvoiceLine'),
            itemId: line.itemId,
            priceId: line.priceId,
            description: line.description,
            position,
            quantity: line.quantity,
            unitAmount: line.unitAmount,
            taxAmount: line.taxAmount,
            discountAmount: line.discountAmount,
            totalAmount: line.totalAmount,
            createdAt: now,
            updatedAt: now,
          })),
        },
      },
    })
  )

  return ok({ id: invoice.id })
}

async function createManualInvoice(
  tenantId: string,
  params: InvoiceCreateParams,
  attribution?: IntegrationAttribution
): ServiceResult<AttributedCreateResult> {
  if (!params.customerId || !params.lines)
    return err('A manual invoice needs a customer and at least one line.', 422)

  const [defaults, tenant, subscription, salesperson] = await Promise.all([
    resolveInvoiceDefaults(tenantId, params.customerId),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { defaultCurrency: true },
    }),
    params.subscriptionId
      ? prisma.subscription.findFirst({
          where: { id: params.subscriptionId, tenantId },
          select: { id: true, customerId: true },
        })
      : null,
    resolveSalesperson(tenantId, params.salespersonId),
  ])
  if (!defaults) return err('The selected customer was not found.', 404)
  if (!tenant) return err('The Billing workspace was not found.', 404)
  if (params.subscriptionId && !subscription)
    return err('The selected subscription was not found.', 404)
  if (subscription && subscription.customerId !== defaults.customer.id)
    return err('The subscription belongs to a different customer.', 422)
  if (params.salespersonId && !salesperson)
    return err('The selected salesperson was not found.', 404)

  const currency =
    params.currency ??
    defaults.customer.defaultCurrency ??
    tenant.defaultCurrency
  if (!(await hasEnabledCurrency(tenantId, currency)))
    return err('Enable the invoice currency before using it.', 422)

  const priceListId =
    params.priceListId === undefined
      ? defaults.customer.priceListId
      : params.priceListId
  const prepared = priceListId
    ? await buildDocumentLines(tenantId, currency, params.lines, priceListId)
    : await buildDocumentLines(tenantId, currency, params.lines)
  if (prepared.error !== null) return err(prepared.error, 422)

  const preparedDocument = prepared.data
  const discountAmount = params.discountAmount ?? 0n
  const shippingAmount = params.shippingAmount ?? 0n
  const adjustmentAmount = params.adjustmentAmount ?? 0n
  const totalAmount =
    preparedDocument.totalAmount -
    discountAmount +
    shippingAmount +
    adjustmentAmount
  if (discountAmount > preparedDocument.subtotalAmount)
    return err('The invoice discount cannot exceed its subtotal.', 422)
  if (totalAmount < 0n)
    return err('Invoice adjustments cannot produce a negative total.', 422)

  const now = nowUnixSeconds()
  const number = await nextDocumentNumber(tenantId, 'INVOICE', now)
  const invoice = await prisma.$transaction(async (tx) => {
    return tx.invoice.create({
      data: {
        id: generateId('Invoice'),
        tenantId,
        ...attributionData(attribution),
        customerId: defaults.customer.id,
        subscriptionId: subscription?.id ?? null,
        ...(preparedDocument.priceList
          ? {
              priceListId: preparedDocument.priceList.id,
              priceListName: preparedDocument.priceList.name,
            }
          : {}),
        salespersonId: salesperson?.id ?? null,
        number,
        status: 'DRAFT',
        billingReason: 'MANUAL',
        currency,
        ...invoiceSnapshotData(defaults, params),
        issueAt: params.issueAt ?? now,
        dueAt: params.dueAt ?? null,
        subtotalAmount: preparedDocument.subtotalAmount,
        taxAmount: preparedDocument.taxAmount,
        discountAmount,
        shippingAmount,
        adjustmentAmount,
        totalAmount,
        amountDue: totalAmount,
        notes: params.notes ?? defaults.notes,
        terms: params.terms ?? defaults.terms,
        createdAt: now,
        updatedAt: now,
        lines: {
          create: preparedDocument.lines.map((line, position) => ({
            id: generateId('InvoiceLine'),
            ...line,
            position,
            createdAt: now,
            updatedAt: now,
          })),
        },
      },
    })
  })

  return ok({ id: invoice.id })
}

type ResolvedInvoiceDefaults = NonNullable<
  Awaited<ReturnType<typeof resolveInvoiceDefaults>>
>

function invoiceSnapshotData(
  defaults: ResolvedInvoiceDefaults,
  params: InvoiceCreateParams
) {
  return {
    orderNumber: params.orderNumber ?? null,
    referenceNumber: params.referenceNumber ?? null,
    subject: params.subject ?? null,
    taxBehavior: params.taxBehavior ?? defaults.taxBehavior,
    customerName: defaults.customer.name,
    customerEmail: defaults.customer.email,
    billingAddressSnapshot: defaults.billingAddressSnapshot ?? undefined,
    shippingAddressSnapshot: defaults.shippingAddressSnapshot ?? undefined,
  }
}

function resolveSalesperson(tenantId: string, salespersonId?: string | null) {
  if (!salespersonId) return null
  return prisma.salesperson.findFirst({
    where: { id: salespersonId, tenantId, isActive: true },
    select: { id: true },
  })
}

function findByIdempotencyKey(
  tenantId: string,
  attribution: IntegrationAttribution
) {
  return prisma.invoice.findFirst({
    where: {
      tenantId,
      sourceAppId: attribution.sourceAppId,
      sourceIdempotencyKey: attribution.sourceIdempotencyKey,
    },
    select: { id: true, sourcePayloadHash: true },
  })
}
