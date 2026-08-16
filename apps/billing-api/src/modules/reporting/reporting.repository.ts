import { prisma } from '@/db/client'

export async function dashboardRows(tenantId: string) {
  const [
    subscriptions,
    customerCount,
    productCount,
    draftQuoteCount,
    invoices,
  ] = await Promise.all([
    prisma.subscription.findMany({
      where: { tenantId },
      include: { items: { include: { price: true } } },
    }),
    prisma.customer.count({ where: { tenantId, status: 'ACTIVE' } }),
    prisma.product.count({ where: { tenantId, isActive: true } }),
    prisma.quote.count({ where: { tenantId, status: 'DRAFT' } }),
    prisma.invoice.findMany({
      where: {
        tenantId,
        status: { in: ['OPEN', 'SENT', 'PARTIALLY_PAID', 'OVERDUE', 'PAID'] },
      },
      select: {
        currency: true,
        totalAmount: true,
        amountDue: true,
        status: true,
      },
    }),
  ])
  return {
    subscriptions,
    customerCount,
    productCount,
    draftQuoteCount,
    invoices,
  }
}
