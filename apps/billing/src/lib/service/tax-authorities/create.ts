import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import { generateId } from '@/lib/id'
import type { ServiceResult } from '@/types/api'
import type { TaxAuthorityCreateParams } from '@/types/tax'

import { err, ok } from '../result'
import { isUniqueConstraintError } from '../shared'

/** Creates a tenant tax authority and maintains one optional default. */
export async function create(
  tenantId: string,
  params: TaxAuthorityCreateParams
): ServiceResult<{ id: string }> {
  try {
    const now = nowUnixSeconds()
    const authority = await prisma.$transaction(async (tx) => {
      const authorityCount = await tx.taxAuthority.count({
        where: { tenantId, isActive: true },
      })
      const isDefault = params.isDefault === true || authorityCount === 0

      if (isDefault)
        await tx.taxAuthority.updateMany({
          where: { tenantId, isDefault: true },
          data: { isDefault: false, updatedAt: now },
        })

      return tx.taxAuthority.create({
        data: {
          id: generateId('TaxAuthority'),
          tenantId,
          name: params.name,
          description: params.description ?? null,
          countryCode: params.countryCode,
          subdivisionCode: params.subdivisionCode ?? null,
          isDefault,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
      })
    })

    return ok({ id: authority.id })
  } catch (error) {
    if (isUniqueConstraintError(error))
      return err('A tax authority with this name already exists.', 409)

    console.error('[billing.service.create]', error)
    return err('Failed to create the tax authority.', 500)
  }
}
