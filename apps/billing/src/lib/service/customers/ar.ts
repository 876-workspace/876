import type { InvoiceStatus, prisma } from '@/lib/db'

type TransactionClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$extends' | '$on' | '$transaction' | '$use'
>

/** Invoice statuses that carry an outstanding balance (money owed). */
const OPEN_INVOICE_STATUSES: InvoiceStatus[] = [
  'OPEN',
  'SENT',
  'PARTIALLY_PAID',
  'OVERDUE',
]

/**
 * Recomputes and persists a customer's denormalized AR position from source
 * rows — the single reconciliation point for every payment, credit-note, and
 * refund mutation. Recomputing (rather than applying deltas) keeps the stored
 * `outstandingReceivable` / `unusedCredits` provably in step with the ledger
 * and immune to accumulated drift. Must run inside the mutating transaction.
 *
 *   outstandingReceivable = Σ open invoice balances
 *   unusedCredits         = Σ unapplied payment cash + Σ open credit-note balances
 */
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

  const outstandingReceivable = invoices._sum.amountDue ?? 0n
  const unusedCredits =
    (payments._sum.unappliedAmount ?? 0n) +
    (creditNotes._sum.balanceAmount ?? 0n)

  await tx.customer.update({
    where: { id: customerId },
    data: { outstandingReceivable, unusedCredits, updatedAt: now },
  })
}
