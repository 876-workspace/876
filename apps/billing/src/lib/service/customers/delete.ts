import { prisma } from '@/lib/db'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'

/** Deletes a billing customer if no associated documents exist. */
export async function deleteCustomer(
  tenantId: string,
  id: string
): ServiceResult<{ id: string }> {
  try {
    const customer = await prisma.customer.findFirst({
      where: { id, tenantId },
      include: {
        _count: {
          select: { invoices: true, quotes: true, subscriptions: true },
        },
      },
    })

    if (!customer) return err('Customer not found.', 404)

    if (
      customer._count.invoices > 0 ||
      customer._count.quotes > 0 ||
      customer._count.subscriptions > 0
    ) {
      return err(
        'This customer has quotes, invoices, or subscriptions. Archive the customer instead.',
        409
      )
    }

    await prisma.customer.delete({
      where: { id },
    })

    return ok({ id })
  } catch (error) {
    console.error('[billing.service.customers.delete]', error)
    return err('Failed to delete the customer.', 500)
  }
}
