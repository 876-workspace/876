import { prisma } from '@/lib/db'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'

/** Deletes a draft estimate. */
export async function deleteEstimate(
  tenantId: string,
  estimateId: string
): ServiceResult<{ id: string }> {
  try {
    const current = await prisma.estimate.findFirst({
      where: { id: estimateId, tenantId },
      select: { id: true, status: true },
    })

    if (!current) return err('Estimate not found.', 404)
    if (current.status !== 'DRAFT')
      return err('Only draft estimates can be deleted.', 409)

    await prisma.estimate.delete({
      where: { id: estimateId },
    })

    return ok({ id: estimateId })
  } catch (error) {
    console.error('[billing.service.estimates.delete]', error)
    return err('Failed to delete the estimate.', 500)
  }
}
