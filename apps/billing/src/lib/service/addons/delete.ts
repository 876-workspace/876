import { prisma } from '@/lib/db'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'

export async function deleteAddon(
  tenantId: string,
  addonId: string
): ServiceResult<{ id: string }> {
  const addon = await prisma.addon.findFirst({
    where: { id: addonId, tenantId },
    include: {
      _count: {
        select: {
          prices: true,
          planAssociations: true,
          couponApplicabilities: true,
        },
      },
    },
  })
  if (!addon) return err('Add-on not found.', 404)
  if (
    addon._count.prices > 0 ||
    addon._count.planAssociations > 0 ||
    addon._count.couponApplicabilities > 0
  )
    return err(
      'This add-on has prices or catalog associations. Archive it instead.',
      409
    )

  try {
    await prisma.addon.delete({ where: { id: addonId } })
    return ok({ id: addonId })
  } catch (error) {
    console.error('[billing.service.addons.delete]', error)
    return err('Failed to delete the add-on.', 500)
  }
}
