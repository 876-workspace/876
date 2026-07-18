import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import { generateId } from '@/lib/id'
import type { ServiceResult } from '@/types/api'
import type { TaxRateCreateParams } from '@/types/tax'

import { err, ok } from '../result'

/** Creates an immutable tax-rate definition for a tenant. */
export async function create(
  tenantId: string,
  params: TaxRateCreateParams
): ServiceResult<{ id: string }> {
  const authority = await prisma.taxAuthority.findFirst({
    where: {
      tenantId,
      isActive: true,
      ...(params.taxAuthorityId
        ? { id: params.taxAuthorityId }
        : { isDefault: true }),
    },
    select: { id: true },
  })
  if (!authority)
    return err(
      params.taxAuthorityId
        ? 'Select an active tax authority from this workspace.'
        : 'Create or select a default tax authority first.',
      422
    )

  try {
    const now = nowUnixSeconds()
    const rate = await prisma.$transaction(async (tx) => {
      const rateCount = await tx.taxRate.count({
        where: { tenantId, isActive: true },
      })
      const isDefault = params.isDefault === true || rateCount === 0

      if (isDefault)
        await tx.taxRate.updateMany({
          where: { tenantId, isDefault: true },
          data: { isDefault: false, updatedAt: now },
        })

      return tx.taxRate.create({
        data: {
          id: generateId('TaxRate'),
          tenantId,
          taxAuthorityId: authority.id,
          name: params.name,
          description: params.description ?? null,
          taxType: params.taxType ?? null,
          rate: params.rate,
          inclusive: params.inclusive,
          startsAt: params.startsAt ?? null,
          isDefault,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
      })
    })

    return ok({ id: rate.id })
  } catch (error) {
    console.error('[billing.service.create]', error)
    return err('Failed to create the tax rate.', 500)
  }
}
