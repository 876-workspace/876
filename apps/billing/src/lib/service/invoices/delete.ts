import { prisma } from '@/lib/db'
import { nowUnixSeconds } from '@876/core/timestamps'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'
import { restoreAdvanceInvoiceSchedules } from '../subscriptions/advance-invoices'

/** Deletes a draft invoice. */
export async function deleteInvoice(
  tenantId: string,
  invoiceId: string
): ServiceResult<{ id: string }> {
  try {
    const current = await prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      select: { id: true, status: true },
    })

    if (!current) return err('Invoice not found.', 404)
    if (current.status !== 'DRAFT')
      return err('Only draft invoices can be deleted.', 409)

    const now = nowUnixSeconds()
    await prisma.$transaction(async (tx) => {
      const advanceRuns = await tx.subscriptionBillingRun.findMany({
        where: {
          invoiceId,
          isAdvanceBilling: true,
          periodAdvancedAt: null,
        },
        select: { subscriptionId: true },
      })
      await tx.subscriptionCharge.updateMany({
        where: { invoiceId, status: 'INVOICED' },
        data: {
          status: 'UNBILLED',
          invoiceId: null,
          invoicedAt: null,
          updatedAt: now,
        },
      })
      await tx.subscriptionBillingRun.deleteMany({ where: { invoiceId } })
      await restoreAdvanceInvoiceSchedules(
        tx,
        [...new Set(advanceRuns.map((run) => run.subscriptionId))],
        now
      )
      await tx.invoice.delete({ where: { id: invoiceId } })
    })

    return ok({ id: invoiceId })
  } catch (error) {
    console.error('[billing.service.invoices.delete]', error)
    return err('Failed to delete the invoice.', 500)
  }
}
