import { prisma } from '@/lib/db'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'

export async function deletePriceList(
  tenantId: string,
  priceListId: string
): ServiceResult<{ id: string }> {
  const list = await prisma.priceList.findFirst({
    where: { id: priceListId, tenantId },
    include: {
      _count: {
        select: {
          customers: true,
          invoices: true,
          quotes: true,
          estimates: true,
        },
      },
    },
  })
  if (!list) return err('Price list not found.', 404)
  if (
    list._count.customers ||
    list._count.invoices ||
    list._count.quotes ||
    list._count.estimates
  )
    return err(
      'This price list is assigned or has transaction history. Archive it instead.',
      409
    )

  await prisma.priceList.delete({ where: { id: priceListId } })
  return ok({ id: priceListId })
}
