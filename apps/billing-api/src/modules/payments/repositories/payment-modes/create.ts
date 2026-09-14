import { nowUnixSeconds } from '@876/core/timestamps'

import { type PaymentMode } from '@/db'
import { prisma } from '@/db/client'
import { generateId } from '@/platform/ids'
import type { ServiceResult } from '../../schemas/api'
import type { PaymentModeCreateParams } from '../../schemas/payment'

import { err, ok } from '../result'
import { isUniqueConstraintError } from '@/platform/prisma-errors'

/** Creates a custom way for the tenant to record received money. */
export async function create(
  tenantId: string,
  params: PaymentModeCreateParams
): ServiceResult<PaymentMode> {
  try {
    const now = nowUnixSeconds()
    const mode = await prisma.$transaction(async (tx) => {
      if (params.isDefault)
        await tx.paymentMode.updateMany({
          where: { tenantId, isDefault: true },
          data: { isDefault: false, updatedAt: now },
        })

      return tx.paymentMode.create({
        data: {
          id: generateId('PaymentMode'),
          tenantId,
          name: params.name,
          isDefault: params.isDefault ?? false,
          isActive: true,
          isSystem: false,
          createdAt: now,
          updatedAt: now,
        },
      })
    })

    return ok(mode)
  } catch (error) {
    if (isUniqueConstraintError(error))
      return err('A payment mode with this name already exists.', 409)

    console.error('[billing.service.paymentModes.create]', error)
    return err('Failed to create the payment mode.', 500)
  }
}
