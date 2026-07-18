import { prisma } from '@/lib/db'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'

/** Deletes an unused custom mode; system and historical modes are retained. */
export async function deleteMode(
  tenantId: string,
  modeId: string
): ServiceResult<{ id: string }> {
  const mode = await prisma.paymentMode.findFirst({
    where: { id: modeId, tenantId },
    include: { _count: { select: { payments: true } } },
  })
  if (!mode) return err('Payment mode not found.', 404)
  if (mode.isSystem)
    return err('Built-in payment modes cannot be deleted.', 409)
  if (mode.isDefault)
    return err('Choose another default payment mode first.', 409)
  if (mode._count.payments > 0)
    return err('Archive this mode instead because payments reference it.', 409)

  try {
    await prisma.paymentMode.delete({ where: { id: modeId } })
    return ok({ id: modeId })
  } catch (error) {
    console.error('[billing.service.paymentModes.delete]', error)
    return err('Failed to delete the payment mode.', 500)
  }
}
