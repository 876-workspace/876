import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/db/client'
import { hasEnabledCurrency } from '@/modules/currencies'
import { generateId } from '@/platform/ids'
import {
  isRetryableTransactionError,
  isUniqueConstraintError,
} from '@/platform/prisma-errors'

import { nextDocumentNumber } from '../document-numbers.repository'
import { lockQuoteConversion } from '../repositories/quotes/conversion'
import {
  createSalesOrderRow,
  resolveSalesOrderDefaults,
  runSalesOrderTransaction,
} from '../repositories/sales-orders'
import { err, ok } from '../repositories/result'
import type { ServiceResult } from '../schemas/api'
import type { SalesOrderQuoteConversionParams } from '../schemas/sales-order'

export async function convertQuoteToSalesOrderWorkflow(
  tenantId: string,
  quoteId: string,
  params: SalesOrderQuoteConversionParams
): ServiceResult<{ id: string; replayed?: true }> {
  const quote = await prisma.quote.findFirst({
    where: { tenantId, id: quoteId },
    select: { customerId: true, currency: true },
  })
  if (!quote) return err('The selected quote was not found.', 404)

  const defaults = await resolveSalesOrderDefaults(
    tenantId,
    quote.customerId,
    params.salespersonId
  )
  if (!defaults) return err('The quote customer was not found.', 404)
  if (params.salespersonId && !defaults.salesperson)
    return err('The selected salesperson was not found.', 404)
  if (!(await hasEnabledCurrency(tenantId, quote.currency)))
    return err(
      'Enable the quote currency before converting it.',
      422,
      'billing/sales-order-currency-disabled'
    )

  const now = nowUnixSeconds()
  const salesOrderId = generateId('SalesOrder')

  try {
    return await runSalesOrderTransaction(async (tx) => {
      const conversion = await lockQuoteConversion(
        tx,
        tenantId,
        quoteId,
        'sales-order'
      )
      if (conversion.kind === 'not_found')
        return err('The selected quote was not found.', 404)
      if (conversion.kind === 'conflict') return err(conversion.message, 409)
      if (conversion.kind === 'replayed')
        return ok({ id: conversion.resourceId, replayed: true })
      if (conversion.quote.status !== 'ACCEPTED')
        return err(
          'Accept the quote before converting it to a Sales Order.',
          409,
          'billing/quote-invalid-state'
        )

      const lockedQuote = await tx.quote.findFirst({
        where: { tenantId, id: quoteId },
        include: { lines: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] } },
      })
      if (!lockedQuote) return err('The selected quote was not found.', 404)

      const number = await nextDocumentNumber(
        tenantId,
        'SALES_ORDER',
        now,
        tx
      )
      const lines = lockedQuote.lines.map((line) => ({
        id: generateId('SalesOrderLine'),
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
      }))

      await createSalesOrderRow(tx, {
        id: salesOrderId,
        tenantId,
        customerId: lockedQuote.customerId,
        quoteId: lockedQuote.id,
        salespersonId: defaults.salesperson?.id ?? null,
        salespersonName: defaults.salesperson?.name ?? null,
        priceListId: lockedQuote.priceListId,
        priceListName: lockedQuote.priceListName,
        number,
        currency: lockedQuote.currency,
        referenceNumber: params.referenceNumber ?? null,
        taxBehavior: params.taxBehavior ?? defaults.taxBehavior,
        customerName: defaults.customer.name,
        customerEmail: defaults.customer.email,
        billingAddressSnapshot: defaults.billingAddressSnapshot,
        shippingAddressSnapshot: defaults.shippingAddressSnapshot,
        orderedAt: params.orderedAt ?? now,
        subtotalAmount: lockedQuote.subtotalAmount,
        taxAmount: lockedQuote.taxAmount,
        discountAmount: lockedQuote.lines.reduce(
          (total, line) => total + line.discountAmount,
          0n
        ),
        totalAmount: lockedQuote.totalAmount,
        notes: params.notes ?? lockedQuote.notes ?? defaults.notes,
        terms: params.terms ?? lockedQuote.terms ?? defaults.terms,
        lines,
        now,
      })

      return ok({ id: salesOrderId })
    })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const converted = await prisma.salesOrder.findFirst({
        where: { tenantId, quoteId },
        select: { id: true },
      })
      if (converted) return ok({ id: converted.id, replayed: true })
    }
    if (isRetryableTransactionError(error))
      return err(
        'The quote conversion changed while it was running; retry.',
        409
      )

    console.error('[billing.workflow.sales-orders.convert-quote]', error)
    return err('Failed to convert the quote to a Sales Order.', 500)
  }
}
