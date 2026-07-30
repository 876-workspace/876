import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma, type Branch, type Prisma } from '@/lib/db'
import {
  branchCreateParamsSchema,
  type BranchCreateParams,
} from '@/types/branch'
import type { ServiceResult } from '@/types/api'

import { isUniqueConstraintError } from '../prisma-errors'
import { ok, err } from '../result'
import { service } from '../index'

export async function create(
  tenantId: string,
  params: BranchCreateParams
): ServiceResult<any> {
  const parsed = branchCreateParamsSchema.safeParse(params)
  if (!parsed.success)
    return err(parsed.error.issues[0]?.message ?? 'Invalid branch.', 400)

  const input = parsed.data
  const now = nowUnixSeconds()

  // Pre-validate address before creating branch transaction
  const addressResult = await service.addresses.create(tenantId, input.address)
  if (!addressResult.success) {
    return addressResult
  }
  const address = addressResult.data

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
          phone: input.phone ?? null,
          isDefault,
          isActive: input.isActive ?? true,
          settings: (input.settings ?? undefined) as
            | Prisma.InputJsonObject
            | undefined,
          addressId: address.id,
          // Dual-write legacy postal columns (to be removed in PR 8)
          street1: address.line1,
          street2: address.line2,
          city: address.city,
          parish: address.regionName,
          country: address.countryCode,
          createdAt: now,
          updatedAt: now,
        },
        include: { address: true }
      })
    })

    return ok(branch)
  } catch (error) {
    // If branch creation fails, cleanup the created address
    await service.addresses.delete(tenantId, address.id).catch(() => {})

    if (isUniqueConstraintError(error))
      return err('A branch with that name already exists.', 409)

    console.error('[service.branches.create]', error)
    return err('Failed to create branch.', 500)
  }
}
