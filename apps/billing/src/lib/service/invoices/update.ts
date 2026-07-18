import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import type { InvoiceUpdateParams } from '@/types/invoice'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'

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
        select: { id: true, status: true },
      }),
      prisma.invoicePreference.findUnique({ where: { tenantId } }),
    ])

    if (!current) return err('Invoice not found.', 404)
    const canEdit =
      current.status === 'DRAFT' ||
      (current.status === 'SENT' && preference?.allowEditingSentInvoices)
    if (!canEdit) return err('This invoice can no longer be edited.', 409)

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

    await prisma.invoice.update({
      where: { id: invoiceId },
      data,
    })

    return ok({ id: invoiceId })
  } catch (error) {
    console.error('[billing.service.invoices.update]', error)
    return err('Failed to update the invoice.', 500)
  }
}
