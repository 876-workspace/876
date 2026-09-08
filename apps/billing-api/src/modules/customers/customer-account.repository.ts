import { prisma } from '@/db/client'

const COLLECTIBLE_INVOICE_STATUSES = [
  'OPEN',
  'SENT',
  'PARTIALLY_PAID',
  'OVERDUE',
] as const

/**
 * The account view is intentionally a projection over Billing-owned financial
 * facts. `Customer` remains the commercial relationship of record; there is no
 * second persisted customer-account aggregate to keep in sync.
 */
export function listCustomerAccountLedgerRows(
  tenantId: string,
  customerId: string
) {
  return prisma.customerLedgerEntry.findMany({
    where: { tenantId, customerId },
    orderBy: [{ effectiveAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
    take: 100,
  })
}

/**
 * Summarize the complete customer subledger without loading unbounded history.
 * The service uses these totals for lifetime cash/billing and the statement's
 * closing balance; the latest 100 rows are presentation only.
 */
export async function summarizeCustomerAccountLedger(
  tenantId: string,
  customerId: string
) {
  const rows = await prisma.customerLedgerEntry.groupBy({
    by: ['type', 'direction'],
    where: { tenantId, customerId },
    _sum: { amount: true },
  })

  return rows.map((row) => ({
    type: row.type,
    direction: row.direction,
    amount: row._sum.amount ?? 0n,
  }))
}

/**
 * Overdue AR is a receivable question, not an invoice-status counter. Query the
 * remaining collectible balance by due date so an invoice that crossed its due
 * date since its last mutation is still reported accurately.
 */
export async function customerOverdueReceivable(
  tenantId: string,
  customerId: string,
  asOf: number
) {
  const aggregate = await prisma.invoice.aggregate({
    where: {
      tenantId,
      customerId,
      status: { in: [...COLLECTIBLE_INVOICE_STATUSES] },
      dueAt: { lt: asOf },
      amountDue: { gt: 0n },
    },
    _sum: { amountDue: true },
  })

  return aggregate._sum.amountDue ?? 0n
}
