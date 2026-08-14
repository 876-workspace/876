import type { InvoiceStatus, Prisma } from '@/db'

type TransactionClient = Prisma.TransactionClient
const OPEN_INVOICE_STATUSES: InvoiceStatus[] = [
  'OPEN',
  'SENT',
  'PARTIALLY_PAID',
  'OVERDUE',
]

export async function recomputeCustomerAr(
  tx: TransactionClient,
  tenantId: string,
  customerId: string,
  now: number
): Promise<void> {
  const [invoices, payments, creditNotes] = await Promise.all([
    tx.invoice.aggregate({
      where: { tenantId, customerId, status: { in: OPEN_INVOICE_STATUSES } },
      _sum: { amountDue: true },
    }),
    tx.payment.aggregate({
      where: { tenantId, customerId, status: 'SUCCEEDED' },
      _sum: { unappliedAmount: true },
    }),
    tx.creditNote.aggregate({
      where: { tenantId, customerId, status: 'OPEN' },
      _sum: { balanceAmount: true },
    }),
  ])
  await tx.customer.update({
    where: { id: customerId },
    data: {
      outstandingReceivable: invoices._sum.amountDue ?? 0n,
      unusedCredits:
        (payments._sum.unappliedAmount ?? 0n) +
        (creditNotes._sum.balanceAmount ?? 0n),
      updatedAt: now,
    },
  })
}
