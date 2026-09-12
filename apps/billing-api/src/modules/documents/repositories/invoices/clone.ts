import { prisma } from '@/db/client'

import type { InvoiceCreateParams } from '../../schemas/invoice'
import type { ServiceResult } from '../../schemas/api'
import { err, ok } from '../result'
import { create } from './create'

/**
 * Clones an invoice into a fresh DRAFT through the canonical create path, so
 * the new invoice's lines, taxes and totals are rebuilt by the same builder
 * every hand-created invoice uses rather than copied field by field.
 *
 * Deliberately not carried over: the number (the create path allocates a new
 * one), the issue/due dates, the source quote/subscription/recurrence links,
 * and every payment or credit allocation.
 */
export async function clone(
  tenantId: string,
  invoiceId: string
): ServiceResult<{ id: string }> {
  const source = await prisma.invoice.findFirst({
    where: { id: invoiceId, tenantId },
    include: { lines: { orderBy: { position: 'asc' } } },
  })
  if (!source) return err('Invoice not found.', 404)

  const params: InvoiceCreateParams = {
    customerId: source.customerId,
    currency: source.currency,
    salespersonId: source.salespersonId,
    priceListId: source.priceListId,
    taxBehavior: source.taxBehavior,
    notes: source.notes,
    terms: source.terms,
    discountAmount: source.discountAmount,
    shippingAmount: source.shippingAmount,
    adjustmentAmount: source.adjustmentAmount,
    lines: source.lines.map((line) => ({
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

  const created = await create(tenantId, params)
  if (created.error !== null)
    return err(created.error, created.status, created.code)
  return ok({ id: created.data.id })
}
