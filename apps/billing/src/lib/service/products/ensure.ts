import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import type { ServiceResult } from '@/types/api'
import type { ProductEnsureParams } from '@/types/sync'

import { err, ok } from '../result'
import { isUniqueConstraintError } from '../shared'
import { create } from './create'

/** Idempotently links or creates the Billing product mirroring a core 876 app. */
export async function ensure(
  tenantId: string,
  params: ProductEnsureParams
): ServiceResult<{ id: string }> {
  const existing = await prisma.product.findFirst({
    where: { tenantId, sourceAppId: params.sourceAppId },
    select: { id: true },
  })
  if (existing) return reconcileProduct(existing.id, params)

  const result = await create(tenantId, {
    slug: params.slug,
    name: params.name,
    description: params.description ?? null,
    type: 'SERVICE',
    sourceAppId: params.sourceAppId,
  })
  if (result.error === null) return reconcileProduct(result.data.id, params)

  if (result.status === 409) {
    const bySlug = await prisma.product.findFirst({
      where: { tenantId, slug: params.slug },
      select: { id: true, sourceAppId: true },
    })

    if (!bySlug) return result

    if (bySlug.sourceAppId === null) {
      return reconcileProduct(bySlug.id, params)
    }

    if (bySlug.sourceAppId === params.sourceAppId)
      return reconcileProduct(bySlug.id, params)

    return err('This product identifier is linked to a different app.', 409)
  }

  return result
}

async function reconcileProduct(
  productId: string,
  params: ProductEnsureParams
): ServiceResult<{ id: string }> {
  try {
    await prisma.product.update({
      where: { id: productId },
      data: {
        sourceAppId: params.sourceAppId,
        slug: params.slug,
        name: params.name,
        description: params.description ?? null,
        isActive: params.active,
        updatedAt: nowUnixSeconds(),
      },
    })

    return ok({ id: productId })
  } catch (error) {
    if (isUniqueConstraintError(error))
      return err('This product identifier is linked to a different app.', 409)

    console.error('[billing.service.ensure]', error)
    return err('Failed to reconcile the product.', 500)
  }
}
