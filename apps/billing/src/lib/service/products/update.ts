import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import type { ProductUpdateParams } from '@/types/product'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'

/** Updates a billing product. */
export async function update(
  tenantId: string,
  productId: string,
  params: ProductUpdateParams
): ServiceResult<{ id: string }> {
  if (Object.keys(params).length === 0) return err('Nothing to update.', 422)

  if (params.fallbackPlanId) {
    const fallback = await prisma.plan.findFirst({
      where: {
        id: params.fallbackPlanId,
        tenantId,
        productId,
        isActive: true,
        isFree: true,
      },
      select: { id: true },
    })
    if (!fallback)
      return err('Select an active free plan from this product.', 422)
  }

  if (params.isActive === false) {
    const [plan, addon, coupon] = await Promise.all([
      prisma.plan.findFirst({
        where: { tenantId, productId, isActive: true },
        select: { id: true },
      }),
      prisma.addon.findFirst({
        where: { tenantId, productId, isActive: true },
        select: { id: true },
      }),
      prisma.coupon.findFirst({
        where: { tenantId, productId, isActive: true },
        select: { id: true },
      }),
    ])
    if (plan || addon || coupon)
      return err(
        'Archive this product’s active plans, add-ons, and coupons first.',
        409
      )
  }

  const data: Record<string, unknown> = {
    updatedAt: nowUnixSeconds(),
  }

  if (params.name !== undefined) data.name = params.name
  if (params.description !== undefined) data.description = params.description
  if (params.type !== undefined) data.type = params.type
  if (params.notificationRecipients !== undefined)
    data.notificationRecipients = params.notificationRecipients
  if (params.redirectUrl !== undefined) data.redirectUrl = params.redirectUrl
  if (params.fallbackPlanId !== undefined)
    data.fallbackPlanId = params.fallbackPlanId
  if (params.isActive !== undefined) data.isActive = params.isActive

  try {
    const result = await prisma.product.updateMany({
      where: { id: productId, tenantId },
      data,
    })

    if (result.count === 0) return err('Product not found.', 404)

    return ok({ id: productId })
  } catch (error) {
    console.error('[billing.service.update]', error)
    return err('Failed to update the product.', 500)
  }
}
