import { calculateDocumentTotals } from '@876/core/money'
import { nowUnixSeconds } from '@876/core/timestamps'
import type { Prisma } from '@/db'

import { hasEnabledCurrency } from '@/modules/currencies'
import { consume as consumeInventory } from '@/modules/inventory'
import { enqueueBillingEvent } from '@/modules/outbox'
import { recordSettledPayment } from '@/modules/payments'
import { generateId } from '@/platform/ids'
import {
  isRetryableTransactionError,
  isUniqueConstraintError,
} from '@/platform/prisma-errors'
import type { CommercialLineSnapshot } from '@/types/commercial-line'

import { nextDocumentNumber } from '../document-numbers.repository'
import { buildDocumentLines } from '../repositories/documents/lines'
import {
  type AttributedCreateResult,
  type IntegrationAttribution,
  resolveIdempotencyReplay,
} from '../repositories/integrations/attribution'
import { err, ok } from '../repositories/result'
import {
  createSalesReceiptRow,
  findQuoteForSalesReceipt,
  findSalesReceiptByIdempotency,
  resolveSalesReceiptDefaults,
  runSalesReceiptTransaction,
} from '../repositories/sales-receipt-workflow'
import { lockQuoteConversion } from '../repositories/quotes/conversion'
import type { ServiceResult } from '../schemas/api'
import type { SalesReceiptCreateParams } from '../schemas/sales-receipt'

class SalesReceiptCreateError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = 'SalesReceiptCreateError'
  }
}

type PreparedSalesReceipt = {
  customerId: string
  quoteId: string | null
  salespersonId: string | null
  salespersonName: string | null
  priceListId: string | null
  priceListName: string | null
  currency: string
  taxBehavior: 'EXCLUSIVE' | 'INCLUSIVE'
  customerName: string
  customerEmail: string | null
  billingAddressSnapshot: Prisma.InputJsonValue | null
  shippingAddressSnapshot: Prisma.InputJsonValue | null
  subtotalAmount: bigint
  taxAmount: bigint
  discountAmount: bigint
  totalAmount: bigint
  notes: string | null
  terms: string | null
  lines: CommercialLineSnapshot[]
}

export async function createSalesReceiptWorkflow(
  tenantId: string,
  params: SalesReceiptCreateParams,
  attribution?: IntegrationAttribution
): ServiceResult<AttributedCreateResult> {
  const replay = attribution
    ? resolveIdempotencyReplay(
        await findSalesReceiptByIdempotency(
          tenantId,
          attribution.sourceAppId,
          attribution.sourceIdempotencyKey
        ),
        attribution
      )
    : null
  if (replay) return replay

  const now = nowUnixSeconds()

  try {
    const prepared = params.quoteId
      ? await prepareFromQuote(tenantId, params)
      : await prepareManual(tenantId, params)

    if (prepared.totalAmount <= 0n)
      return err('A Sales Receipt total must be greater than zero.', 422)
    if (params.bankCharges >= prepared.totalAmount)
      return err('Bank charges must be less than the Sales Receipt total.', 422)

    const salesReceiptId = generateId('SalesReceipt')
    const receiptAt = params.receiptAt ?? now
    const paymentDate = params.paymentDate ?? receiptAt

    const replayedSalesReceiptId = await runSalesReceiptTransaction(
      async (tx) => {
        if (prepared.quoteId) {
          const conversion = await lockQuoteConversion(
            tx,
            tenantId,
            prepared.quoteId,
            'sales-receipt'
          )
          if (conversion.kind === 'not_found')
            throw new SalesReceiptCreateError(
              'The selected quote was not found.',
              404
            )
          if (conversion.kind === 'conflict')
            throw new SalesReceiptCreateError(conversion.message, 409)
          if (conversion.kind === 'replayed') return conversion.resourceId
          if (conversion.quote.status !== 'ACCEPTED')
            throw new SalesReceiptCreateError(
              'Accept the quote before converting it to a Sales Receipt.',
              409
            )
        }

        const [number, paymentNumber] = await Promise.all([
          nextDocumentNumber(tenantId, 'SALES_RECEIPT', now, tx),
          nextDocumentNumber(tenantId, 'PAYMENT', now, tx),
        ])

        const payment = await recordSettledPayment(
          tx,
          tenantId,
          {
            number: paymentNumber,
            customerId: prepared.customerId,
            paymentModeId: params.paymentModeId,
            depositAccountId: params.depositAccountId,
            amount: prepared.totalAmount,
            bankCharges: params.bankCharges,
            currency: prepared.currency,
            paymentDate,
            referenceNumber: params.paymentReferenceNumber,
            notes: params.notes,
          },
          now,
          attribution
        )

        await createSalesReceiptRow(tx, {
          id: salesReceiptId,
          tenantId,
          customerId: prepared.customerId,
          quoteId: prepared.quoteId,
          paymentId: payment.id,
          salespersonId: prepared.salespersonId,
          salespersonName: prepared.salespersonName,
          priceListId: prepared.priceListId,
          priceListName: prepared.priceListName,
          number,
          currency: prepared.currency,
          referenceNumber: params.referenceNumber,
          taxBehavior: prepared.taxBehavior,
          customerName: prepared.customerName,
          customerEmail: prepared.customerEmail,
          billingAddressSnapshot: prepared.billingAddressSnapshot,
          shippingAddressSnapshot: prepared.shippingAddressSnapshot,
          receiptAt,
          subtotalAmount: prepared.subtotalAmount,
          taxAmount: prepared.taxAmount,
          discountAmount: prepared.discountAmount,
          totalAmount: prepared.totalAmount,
          notes: prepared.notes,
          terms: prepared.terms,
          sourceAppId: attribution?.sourceAppId,
          sourceExternalReference: attribution?.sourceExternalReference,
          sourceIdempotencyKey: attribution?.sourceIdempotencyKey,
          sourcePayloadHash: attribution?.sourcePayloadHash,
          lines: prepared.lines,
          now,
        })

        const stock = await consumeInventory(tx, tenantId, {
          reference: { type: 'sales-receipt', id: salesReceiptId },
          reason: 'sale',
          lines: prepared.lines.flatMap((line) => {
            const target = line.variantId
              ? ({ type: 'variant', id: line.variantId } as const)
              : line.itemId
                ? ({ type: 'item', id: line.itemId } as const)
                : null
            return target ? [{ target, quantity: line.quantity }] : []
          }),
          occurredAt: receiptAt,
        })
        if (stock.error !== null)
          throw new SalesReceiptCreateError(stock.error, stock.status ?? 422)

        await enqueueBillingEvent(tx, tenantId, {
          type: 'sales-receipt.created',
          version: 1,
          resource: { type: 'sales-receipt', id: salesReceiptId },
          payload: {
            salesReceiptId,
            customerId: prepared.customerId,
            paymentId: payment.id,
            number,
            currency: prepared.currency,
            totalAmount: prepared.totalAmount.toString(),
            receiptAt,
          },
          occurredAt: now,
        })

        return null
      }
    )

    if (replayedSalesReceiptId)
      return ok({ id: replayedSalesReceiptId, replayed: true })

    return ok({ id: salesReceiptId })
  } catch (error) {
    if (error instanceof SalesReceiptCreateError)
      return err(error.message, error.status)

    if (isUniqueConstraintError(error) && params.quoteId) {
      const converted = await findQuoteForSalesReceipt(tenantId, params.quoteId)
      if (converted?.convertedSalesReceipt)
        return ok({ id: converted.convertedSalesReceipt.id, replayed: true })
    }

    if (isUniqueConstraintError(error) && attribution) {
      const replayAfterConflict = resolveIdempotencyReplay(
        await findSalesReceiptByIdempotency(
          tenantId,
          attribution.sourceAppId,
          attribution.sourceIdempotencyKey
        ),
        attribution
      )
      if (replayAfterConflict) return replayAfterConflict
      return err(
        'A Sales Receipt with these unique details already exists.',
        409
      )
    }

    if (isRetryableTransactionError(error))
      return err(
        'Payment, stock, or Sales Receipt state changed; retry the sale.',
        409
      )

    console.error('[billing.workflow.sales-receipts.create]', error)
    return err('Failed to create the Sales Receipt.', 500)
  }
}

async function prepareManual(
  tenantId: string,
  params: SalesReceiptCreateParams
): Promise<PreparedSalesReceipt> {
  if (!params.customerId || !params.lines)
    throw new SalesReceiptCreateError(
      'A manual Sales Receipt needs a customer and at least one line.',
      422
    )

  const defaults = await resolveSalesReceiptDefaults(
    tenantId,
    params.customerId,
    params.salespersonId
  )
  if (!defaults)
    throw new SalesReceiptCreateError(
      'The selected customer was not found.',
      404
    )
  if (params.salespersonId && !defaults.salesperson)
    throw new SalesReceiptCreateError(
      'The selected salesperson was not found.',
      404
    )

  const currency =
    params.currency ??
    defaults.customer.defaultCurrency ??
    defaults.tenant.defaultCurrency
  if (!(await hasEnabledCurrency(tenantId, currency)))
    throw new SalesReceiptCreateError(
      'Enable the Sales Receipt currency before using it.',
      422
    )

  const priceListId =
    params.priceListId === undefined
      ? defaults.customer.priceListId
      : params.priceListId
  const prepared = priceListId
    ? await buildDocumentLines(tenantId, currency, params.lines, priceListId)
    : await buildDocumentLines(tenantId, currency, params.lines)
  if (prepared.error !== null)
    throw new SalesReceiptCreateError(prepared.error, 422)

  const totals = calculateDocumentTotals({
    lines: prepared.data.lineAmounts,
    discountAmount: params.discountAmount,
  })
  if (totals.error !== null)
    throw new SalesReceiptCreateError(totals.error.message, 422)

  return {
    customerId: defaults.customer.id,
    quoteId: null,
    salespersonId: defaults.salesperson?.id ?? null,
    salespersonName: defaults.salesperson?.name ?? null,
    priceListId: prepared.data.priceList?.id ?? null,
    priceListName: prepared.data.priceList?.name ?? null,
    currency,
    taxBehavior: params.taxBehavior ?? defaults.taxBehavior,
    customerName: defaults.customer.name,
    customerEmail: defaults.customer.email,
    billingAddressSnapshot: defaults.billingAddressSnapshot,
    shippingAddressSnapshot: defaults.shippingAddressSnapshot,
    subtotalAmount: prepared.data.subtotalAmount,
    taxAmount: prepared.data.taxAmount,
    discountAmount: params.discountAmount,
    totalAmount: totals.data.totalAmount,
    notes: params.notes ?? defaults.notes,
    terms: params.terms ?? defaults.terms,
    lines: prepared.data.lines,
  }
}

async function prepareFromQuote(
  tenantId: string,
  params: SalesReceiptCreateParams
): Promise<PreparedSalesReceipt> {
  const quoteId = params.quoteId!
  const quote = await findQuoteForSalesReceipt(tenantId, quoteId)
  if (!quote)
    throw new SalesReceiptCreateError('The selected quote was not found.', 404)
  if (quote.status !== 'ACCEPTED')
    throw new SalesReceiptCreateError(
      'Accept the quote before converting it to a Sales Receipt.',
      409
    )
  const defaults = await resolveSalesReceiptDefaults(
    tenantId,
    quote.customerId,
    params.salespersonId
  )
  if (!defaults)
    throw new SalesReceiptCreateError('The quote customer was not found.', 404)
  if (params.salespersonId && !defaults.salesperson)
    throw new SalesReceiptCreateError(
      'The selected salesperson was not found.',
      404
    )
  if (!(await hasEnabledCurrency(tenantId, quote.currency)))
    throw new SalesReceiptCreateError(
      'Enable the quote currency before converting it.',
      422
    )

  return {
    customerId: quote.customerId,
    quoteId: quote.id,
    salespersonId: defaults.salesperson?.id ?? null,
    salespersonName: defaults.salesperson?.name ?? null,
    priceListId: quote.priceListId,
    priceListName: quote.priceListName,
    currency: quote.currency,
    taxBehavior: params.taxBehavior ?? defaults.taxBehavior,
    customerName: defaults.customer.name,
    customerEmail: defaults.customer.email,
    billingAddressSnapshot: defaults.billingAddressSnapshot,
    shippingAddressSnapshot: defaults.shippingAddressSnapshot,
    subtotalAmount: quote.subtotalAmount,
    taxAmount: quote.taxAmount,
    discountAmount: 0n,
    totalAmount: quote.totalAmount,
    notes: params.notes ?? quote.notes ?? defaults.notes,
    terms: params.terms ?? quote.terms ?? defaults.terms,
    lines: quote.lines.map((line) => ({
      itemId: line.itemId,
      variantId: line.variantId,
      variantName: line.variantName,
      variantSku: line.variantSku,
      priceId: line.priceId,
      taxRateId: null,
      description: line.description,
      unit: null,
      quantity: line.quantity,
      unitAmount: line.unitAmount,
      taxAmount: line.taxAmount,
      taxName: null,
      taxRate: null,
      taxInclusive: false,
      discountAmount: line.discountAmount,
      totalAmount: line.totalAmount,
    })),
  }
}
