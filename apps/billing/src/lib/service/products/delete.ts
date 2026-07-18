import { prisma } from '@/lib/db'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'

/** Deletes a product if it is not referenced anywhere. */
export async function deleteProduct(
  tenantId: string,
  productId: string
): ServiceResult<{ id: string }> {
  try {
    const product = await prisma.product.findFirst({
      where: { id: productId, tenantId },
      include: {
        _count: {
          select: { plans: true, addons: true, coupons: true },
        },
      },
    })

    if (!product) return err('Product not found.', 404)

    if (
      product._count.plans > 0 ||
      product._count.addons > 0 ||
      product._count.coupons > 0
    ) {
      return err(
        'This product has plans, add-ons, or coupons. Archive it instead.',
        409
      )
    }

    await prisma.product.delete({
      where: { id: productId },
    })

    return ok({ id: productId })
  } catch (error) {
    console.error('[billing.service.products.delete]', error)
    return err('Failed to delete the product.', 500)
  }
}
