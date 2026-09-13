import type { Prisma } from '@/db'

/** Locks one Sales Order before checking/creating its active Invoice. */
export async function lockSalesOrderForInvoice(
  tx: Prisma.TransactionClient,
  tenantId: string,
  salesOrderId: string
) {
  const locked = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM billing_sales_orders
    WHERE tenant_id = ${tenantId} AND id = ${salesOrderId}
    FOR UPDATE
  `
  if (!locked[0]) return null

  return tx.salesOrder.findFirst({
    where: { tenantId, id: salesOrderId },
    include: {
      lines: { orderBy: [{ position: 'asc' }, { id: 'asc' }] },
      invoices: {
        where: { status: { not: 'VOID' } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true, status: true },
      },
    },
  })
}
