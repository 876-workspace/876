import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import type { ServiceResult } from '@/types/api'
import type { TaxRateUpdateParams } from '@/types/tax'

import { err, ok } from '../result'

/**
 * Archives, restores, or promotes a rate to the workspace default; its
 * percentage and jurisdiction stay immutable.
 */
export async function update(
  tenantId: string,
  rateId: string,
  params: TaxRateUpdateParams
): ServiceResult<{ id: string }> {
  const existing = await prisma.taxRate.findFirst({
    where: { id: rateId, tenantId },
  })
  if (!existing) return err('Tax rate not found.', 404)

  if (params.isActive === false && existing.isDefault)
    return err('Choose another default rate before archiving this one.', 409)
  if (params.isDefault === false && existing.isDefault)
    return err('Choose another rate as the default instead.', 409)
  if (params.isDefault === true && params.isActive === false)
    return err('An archived rate cannot be the default.', 422)

  try {
    const now = nowUnixSeconds()
    await prisma.$transaction(async (tx) => {
      if (params.isDefault === true)
        await tx.taxRate.updateMany({
          where: { tenantId, isDefault: true },
          data: { isDefault: false, updatedAt: now },
        })

      await tx.taxRate.update({
        where: { id: rateId },
        data: {
          ...(params.isDefault === true && { isDefault: true, isActive: true }),
          ...(params.isActive !== undefined && { isActive: params.isActive }),
          updatedAt: now,
        },
      })
    })

    return ok({ id: rateId })
  } catch (error) {
    console.error('[billing.service.update]', error)
    return err('Failed to update the tax rate.', 500)
  }
}
