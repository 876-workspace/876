import { prisma } from '@/lib/db'

/** Builds a customer account summary from auditable financial resources. */
export async function account(tenantId: string, customerId: string) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId },
    select: {
      id: true,
      name: true,
      defaultCurrency: true,
      outstandingReceivable: true,
      unusedCredits: true,
    },
  })
  if (!customer) return null

  const [invoices, payments, refunds, statement] = await Promise.all([
    prisma.invoice.aggregate({
      where: {
        tenantId,
        customerId,
        status: { notIn: ['DRAFT', 'VOID'] },
      },
      _sum: { totalAmount: true },
    }),
    prisma.payment.aggregate({
      where: { tenantId, customerId, status: 'SUCCEEDED' },
      _sum: { amount: true },
    }),
    prisma.refund.aggregate({
      where: { tenantId, customerId },
      _sum: { amount: true },
    }),
    prisma.customerLedgerEntry.findMany({
      where: { tenantId, customerId },
      orderBy: [{ effectiveAt: 'desc' }, { id: 'desc' }],
      take: 100,
    }),
  ])
  const lifetimePayments = payments._sum.amount ?? 0n
  const lifetimeRefunds = refunds._sum.amount ?? 0n

  return {
    object: 'customer_account' as const,
    customer: {
      object: 'customer' as const,
      id: customer.id,
      name: customer.name,
    },
    currency: customer.defaultCurrency,
    lifetimeBilled: (invoices._sum.totalAmount ?? 0n).toString(),
    lifetimePaid: (lifetimePayments - lifetimeRefunds).toString(),
    outstandingReceivable: customer.outstandingReceivable.toString(),
    availableCredit: customer.unusedCredits.toString(),
    netPosition: (
      customer.outstandingReceivable - customer.unusedCredits
    ).toString(),
    statement: statement.map((entry) => ({
      object: 'customer_ledger_entry' as const,
      id: entry.id,
      type: entry.type,
      direction: entry.direction,
      amount: entry.amount.toString(),
      currency: entry.currency,
      description: entry.description,
      effectiveAt: entry.effectiveAt,
      invoiceId: entry.invoiceId,
      paymentId: entry.paymentId,
      creditNoteId: entry.creditNoteId,
      refundId: entry.refundId,
    })),
  }
}
