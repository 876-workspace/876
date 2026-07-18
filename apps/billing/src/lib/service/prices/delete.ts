import { prisma } from '@/lib/db'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'

/** Deletes a price if it is not referenced anywhere. */
export async function deletePrice(
  tenantId: string,
  priceId: string
): ServiceResult<{ id: string }> {
  try {
    const price = await prisma.price.findFirst({
      where: { id: priceId, tenantId },
      include: {
        _count: {
          select: {
            subscriptionItems: true,
            quoteLines: true,
            estimateLines: true,
            invoiceLines: true,
            creditNoteLines: true,
            priceListEntries: true,
          },
        },
      },
    })

    if (!price) return err('Price not found.', 404)

    if (
      price._count.subscriptionItems > 0 ||
      price._count.quoteLines > 0 ||
      price._count.estimateLines > 0 ||
      price._count.invoiceLines > 0 ||
      price._count.creditNoteLines > 0 ||
      price._count.priceListEntries > 0
    ) {
      return err(
        'This price is used by subscriptions or documents. Deactivate the price instead.',
        409
      )
    }

    await prisma.price.delete({
      where: { id: priceId },
    })

    return ok({ id: priceId })
  } catch (error) {
    console.error('[billing.service.prices.delete]', error)
    return err('Failed to delete the price.', 500)
  }
}
