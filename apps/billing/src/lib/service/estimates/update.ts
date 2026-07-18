import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import type { EstimateUpdateParams } from '@/types/estimate'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'

/** Updates a draft estimate's header details. */
export async function update(
  tenantId: string,
  estimateId: string,
  params: EstimateUpdateParams
): ServiceResult<{ id: string }> {
  if (Object.keys(params).length === 0) return err('Nothing to update.', 422)

  try {
    const current = await prisma.estimate.findFirst({
      where: { id: estimateId, tenantId },
      select: { id: true, status: true },
    })

    if (!current) return err('Estimate not found.', 404)
    if (current.status !== 'DRAFT')
      return err('Only draft estimates can be edited.', 409)

    const data: Record<string, unknown> = {
      updatedAt: nowUnixSeconds(),
    }

    if (params.issueAt !== undefined) data.issueAt = params.issueAt
    if (params.expiresAt !== undefined) data.expiresAt = params.expiresAt
    if (params.notes !== undefined) data.notes = params.notes
    if (params.terms !== undefined) data.terms = params.terms

    await prisma.estimate.update({
      where: { id: estimateId },
      data,
    })

    return ok({ id: estimateId })
  } catch (error) {
    console.error('[billing.service.estimates.update]', error)
    return err('Failed to update the estimate.', 500)
  }
}
