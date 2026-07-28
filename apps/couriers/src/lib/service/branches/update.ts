import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma, type Branch, type Prisma } from '@/lib/db'
import {
  branchUpdateParamsSchema,
  type BranchUpdateParams,
} from '@/types/branch'
import type { ServiceResult } from '@/types/api'

import { isUniqueConstraintError } from '../prisma-errors'
import { ok, err } from '../result'

export async function update(
  tenantId: string,
  id: string,
  params: BranchUpdateParams
): ServiceResult<Branch> {
  const parsed = branchUpdateParamsSchema.safeParse(params)
  if (!parsed.success)
    return err(parsed.error.issues[0]?.message ?? 'Invalid branch.', 400)

  const input = parsed.data
  const now = nowUnixSeconds()

  try {
    const branch = await prisma.$transaction(async (tx) => {
      const current = await tx.branch.findFirst({
        where: { id, tenantId },
        select: { id: true, isDefault: true },
      })
      if (!current) return null

      // A tenant must always keep exactly one default branch, so clearing the
      // flag on the current default is rejected rather than silently ignored —
      // promote another branch instead.
      if (current.isDefault && input.isDefault === false)
        throw new DefaultBranchError()

      if (input.isDefault === true && !current.isDefault)
        await tx.branch.updateMany({
          where: { tenantId, isDefault: true },
          data: { isDefault: false, updatedAt: now },
        })

      return tx.branch.update({
        where: { id: current.id },
        data: {
          ...(input.name === undefined ? {} : { name: input.name }),
          ...(input.street1 === undefined ? {} : { street1: input.street1 }),
          ...(input.street2 === undefined ? {} : { street2: input.street2 }),
          ...(input.city === undefined ? {} : { city: input.city }),
          ...(input.parish === undefined ? {} : { parish: input.parish }),
          ...(input.country === undefined ? {} : { country: input.country }),
          ...(input.phone === undefined ? {} : { phone: input.phone }),
          ...(input.isDefault === undefined
            ? {}
            : { isDefault: input.isDefault }),
          ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
          ...(input.settings === undefined
            ? {}
            : { settings: input.settings as Prisma.InputJsonObject }),
          updatedAt: now,
        },
      })
    })

    if (!branch) return err('Branch not found.', 404)

    return ok(branch)
  } catch (error) {
    if (error instanceof DefaultBranchError)
      return err(
        'Set another branch as the default instead of clearing this one.',
        409
      )
    if (isUniqueConstraintError(error))
      return err('A branch with that name already exists.', 409)

    console.error('[service.branches.update]', error)
    return err('Failed to update branch.', 500)
  }
}

class DefaultBranchError extends Error {}
