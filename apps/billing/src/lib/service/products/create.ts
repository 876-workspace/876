import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import { generateId } from '@/lib/id'
import type { ProductCreateParams } from '@/types/product'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'
import { isUniqueConstraintError } from '../shared'

/** Creates a subscription product grouping plans and future add-ons. */
export async function create(
  tenantId: string,
  params: ProductCreateParams
): ServiceResult<{ id: string }> {
  try {
    const now = nowUnixSeconds()
    const product = await prisma.product.create({
      data: {
        id: generateId('Product'),
        tenantId,
        sourceAppId: params.sourceAppId ?? null,
        slug: params.slug,
        name: params.name,
        description: params.description ?? null,
        type: params.type,
        notificationRecipients: params.notificationRecipients ?? null,
        redirectUrl: params.redirectUrl ?? null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    })

    return ok({ id: product.id })
  } catch (error) {
    if (isUniqueConstraintError(error))
      return err('A product with this identifier already exists.', 409)

    console.error('[billing.service.create]', error)
    return err('Failed to create the product.', 500)
  }
}
