import { nowUnixSeconds } from '@876/core/timestamps'
import { calculateDocumentTotals } from '@876/core/money'

import { prisma } from '@/db/client'
import { generateId } from '@/platform/ids'
import type { InvoiceUpdateParams } from '../../schemas/invoice'
import type { ServiceResult } from '../../schemas/api'

import { err, ok } from '../result'
import { buildDocumentLines } from '../documents/lines'

/** Updates a draft invoice's header details. */
export async function update(
  tenantId: string,
  invoiceId: string,
  params: InvoiceUpdateParams
): ServiceResult<{ id: string }> {
  if (Object.keys(params).length === 0) return err('Nothing to update.', 422)

  try {
    const [current, preference] = await Promise.all([
      prisma.invoice.findFirst({
        where: { id: invoiceId, tenantId },
        select: {
          id: true,
          status: true,
          currency: true,
          priceListId: true,
          discountAmount: true,
          shippingAmount: true,
          adjustmentAmount: true,
        },
      }),
      prisma.invoicePreference.findUnique({ where: { tenantId } }),
    ])

    if (!current) return err('Invoice not found.', 404)
    const canEdit =
      current.status === 'DRAFT' ||
      (current.status === 'SENT' && preference?.allowEditingSentInvoices)
    if (!canEdit) return err('This invoice can no longer be edited.', 409)
    if (params.lines && current.status !== 'DRAFT')
      return err('Only draft invoices can have their line items changed.', 409)

    const data: Record<string, unknown> = {
      updatedAt: nowUnixSeconds(),
    }

    if (params.issueAt !== undefined) data.issueAt = params.issueAt
    if (params.dueAt !== undefined) data.dueAt = params.dueAt
    if (params.notes !== undefined) data.notes = params.notes
    if (params.terms !== undefined) data.terms = params.terms
    if (params.orderNumber !== undefined) data.orderNumber = params.orderNumber
    if (params.referenceNumber !== undefined)
      data.referenceNumber = params.referenceNumber
    if (params.subject !== undefined) data.subject = params.subject

    if (params.lines) {
      const prepared = await buildDocumentLines(
        tenantId,
        current.currency,
        params.lines,
        current.priceListId
      )
      if (prepared.error !== null) return err(prepared.error, 422)
      const totals = calculateDocumentTotals({
        lines: prepared.data.lineAmounts,
        discountAmount: current.discountAmount,
        shippingAmount: current.shippingAmount,
        adjustmentAmount: current.adjustmentAmount,
      })
      if (totals.error !== null) return err(totals.error.message, 422)

      await prisma.$transaction(async (tx) => {
        await tx.invoiceLine.deleteMany({ where: { invoiceId } })
        await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            ...data,
            subtotalAmount: prepared.data.subtotalAmount,
            taxAmount: prepared.data.taxAmount,
            totalAmount: totals.data.totalAmount,
            amountDue: totals.data.totalAmount,
            lines: {
              create: prepared.data.lines.map((line, position) => ({
                id: generateId('InvoiceLine'),
                ...line,
                position,
                createdAt: nowUnixSeconds(),
                updatedAt: nowUnixSeconds(),
              })),
            },
          },
        })
      })
    } else {
      await prisma.invoice.update({ where: { id: invoiceId }, data })
    }

    return ok({ id: invoiceId })
  } catch (error) {
    console.error('[billing.service.invoices.update]', error)
    return err('Failed to update the invoice.', 500)
  }
}
