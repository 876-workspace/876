import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma, type Branch, type Prisma } from '@/lib/db'
import {
  branchCreateParamsSchema,
  type BranchCreateParams,
} from '@/types/branch'
import type { ServiceResult } from '@/types/api'

import { isUniqueConstraintError } from '../prisma-errors'
import { ok, err } from '../result'

export async function create(
  tenantId: string,
  params: BranchCreateParams
): ServiceResult<Branch> {
  const parsed = branchCreateParamsSchema.safeParse(params)
  if (!parsed.success)
    return err(parsed.error.issues[0]?.message ?? 'Invalid branch.', 400)

  const input = parsed.data
  const now = nowUnixSeconds()

  try {
    const branch = await prisma.$transaction(async (tx) => {
      // A tenant's first branch is its default regardless of what was requested,
      // so customers and packages always have a location to route to.
      const count = await tx.branch.count({ where: { tenantId } })
      const isDefault = count === 0 || input.isDefault === true

      if (isDefault && count > 0)
        await tx.branch.updateMany({
          where: { tenantId, isDefault: true },
          data: { isDefault: false, updatedAt: now },
        })

      return tx.branch.create({
        data: {
          tenantId,
          name: input.name,
          street1: input.street1,
          street2: input.street2 ?? null,
          city: input.city,
          parish: input.parish ?? null,
          country: input.country ?? 'JM',
          phone: input.phone ?? null,
          isDefault,
          isActive: input.isActive ?? true,
          settings: (input.settings ?? undefined) as
            | Prisma.InputJsonObject
            | undefined,
          createdAt: now,
          updatedAt: now,
        },
      })
    })

    return ok(branch)
  } catch (error) {
    if (isUniqueConstraintError(error))
      return err('A branch with that name already exists.', 409)

    console.error('[service.branches.create]', error)
    return err('Failed to create branch.', 500)
  }
}
