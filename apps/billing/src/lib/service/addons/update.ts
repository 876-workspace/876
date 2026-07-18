import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import type { AddonUpdateParams } from '@/types/addon'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'

export async function update(
  tenantId: string,
  addonId: string,
  params: AddonUpdateParams
): ServiceResult<{ id: string }> {
  if (Object.keys(params).length === 0) return err('Nothing to update.', 422)

  const data = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined)
  )
  try {
    const result = await prisma.addon.updateMany({
      where: { id: addonId, tenantId },
      data: { ...data, updatedAt: nowUnixSeconds() },
    })
    if (result.count === 0) return err('Add-on not found.', 404)
    return ok({ id: addonId })
  } catch (error) {
    console.error('[billing.service.addons.update]', error)
    return err('Failed to update the add-on.', 500)
  }
}
