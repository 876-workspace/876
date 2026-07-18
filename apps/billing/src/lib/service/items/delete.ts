import { prisma } from '@/lib/db'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'

/** Deletes an item if it is not referenced anywhere. */
export async function deleteItem(
  tenantId: string,
  itemId: string
): ServiceResult<{ id: string }> {
  try {
    const item = await prisma.item.findFirst({
      where: { id: itemId, tenantId },
      include: {
        _count: {
          select: { prices: true, quoteLines: true, invoiceLines: true },
        },
      },
    })

    if (!item) return err('Item not found.', 404)

    if (
      item._count.prices > 0 ||
      item._count.quoteLines > 0 ||
      item._count.invoiceLines > 0
    ) {
      return err(
        'This item is referenced by prices or documents. Deactivate the item instead.',
        409
      )
    }

    await prisma.item.delete({
      where: { id: itemId },
    })

    return ok({ id: itemId })
  } catch (error) {
    console.error('[billing.service.items.delete]', error)
    return err('Failed to delete the item.', 500)
  }
}
