import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import type { ServiceResult } from '@/types/api'
import type { TaxAuthorityUpdateParams } from '@/types/tax'

import { err, ok } from '../result'
import { isUniqueConstraintError } from '../shared'

/** Updates mutable authority metadata without changing linked historical rates. */
export async function update(
  tenantId: string,
  authorityId: string,
  params: TaxAuthorityUpdateParams
): ServiceResult<{ id: string }> {
  const existing = await prisma.taxAuthority.findFirst({
    where: { id: authorityId, tenantId },
  })
  if (!existing) return err('Tax authority not found.', 404)

  if (params.isActive === false && existing.isDefault)
    return err(
      'Choose another default authority before archiving this one.',
      409
    )
  if (params.isDefault === false && existing.isDefault)
    return err('Choose another authority as the default instead.', 409)
  if (params.isDefault === true && params.isActive === false)
    return err('An archived authority cannot be the default.', 422)

  try {
    const now = nowUnixSeconds()
    await prisma.$transaction(async (tx) => {
      if (params.isDefault === true)
        await tx.taxAuthority.updateMany({
          where: { tenantId, isDefault: true },
          data: { isDefault: false, updatedAt: now },
        })

      await tx.taxAuthority.update({
        where: { id: authorityId },
        data: {
          ...(params.name !== undefined && { name: params.name }),
          ...(params.description !== undefined && {
            description: params.description,
          }),
          ...(params.countryCode !== undefined && {
            countryCode: params.countryCode,
          }),
          ...(params.subdivisionCode !== undefined && {
            subdivisionCode: params.subdivisionCode,
          }),
          ...(params.isDefault === true && { isDefault: true, isActive: true }),
          ...(params.isActive !== undefined && { isActive: params.isActive }),
          updatedAt: now,
        },
      })
    })

    return ok({ id: authorityId })
  } catch (error) {
    if (isUniqueConstraintError(error))
      return err('A tax authority with this name already exists.', 409)

    console.error('[billing.service.update]', error)
    return err('Failed to update the tax authority.', 500)
  }
}
