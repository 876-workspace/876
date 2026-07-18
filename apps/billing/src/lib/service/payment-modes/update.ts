import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import type { ServiceResult } from '@/types/api'
import type { PaymentModeUpdateParams } from '@/types/payment'

import { err, ok } from '../result'
import { isUniqueConstraintError } from '../shared'

/** Updates a mode while preserving one active default per tenant. */
export async function update(
  tenantId: string,
  modeId: string,
  params: PaymentModeUpdateParams
): ServiceResult<{ id: string }> {
  const current = await prisma.paymentMode.findFirst({
    where: { id: modeId, tenantId },
  })
  if (!current) return err('Payment mode not found.', 404)
  if (current.isSystem && params.name && params.name !== current.name)
    return err('Built-in payment modes cannot be renamed.', 409)
  if (current.isDefault && params.isDefault === false)
    return err('Choose another default payment mode first.', 409)
  if (current.isDefault && params.isActive === false)
    return err('The default payment mode cannot be archived.', 409)
  if (params.isDefault === true && params.isActive === false)
    return err('An archived payment mode cannot be the default.', 422)

  try {
    const now = nowUnixSeconds()
    await prisma.$transaction(async (tx) => {
      if (params.isDefault === true)
        await tx.paymentMode.updateMany({
          where: { tenantId, isDefault: true, id: { not: modeId } },
          data: { isDefault: false, updatedAt: now },
        })

      await tx.paymentMode.update({
        where: { id: modeId },
        data: {
          ...(params.name !== undefined && { name: params.name }),
          ...(params.isDefault === true && {
            isDefault: true,
            isActive: true,
          }),
          ...(params.isActive !== undefined && {
            isActive: params.isActive,
          }),
          updatedAt: now,
        },
      })
    })

    return ok({ id: modeId })
  } catch (error) {
    if (isUniqueConstraintError(error))
      return err('A payment mode with this name already exists.', 409)

    console.error('[billing.service.paymentModes.update]', error)
    return err('Failed to update the payment mode.', 500)
  }
}
