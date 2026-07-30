import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma, type Prisma } from '@/lib/db'
import {
  branchUpdateParamsSchema,
  type BranchUpdateParams,
} from '@/types/branch'
import type { ServiceResult } from '@/types/api'

import { isUniqueConstraintError } from '../prisma-errors'
import { ok, err } from '../result'
import { service } from '../index'

export async function update(
  tenantId: string,
  id: string,
  params: BranchUpdateParams
): ServiceResult<any> {
  const parsed = branchUpdateParamsSchema.safeParse(params)
  if (!parsed.success)
    return err(parsed.error.issues[0]?.message ?? 'Invalid branch.', 400)

  const input = parsed.data
  const now = nowUnixSeconds()

  try {
    // We fetch the branch outside the transaction because address updates use platform client
    const current = await prisma.branch.findFirst({
      where: { id, tenantId },
      select: { id: true, isDefault: true, addressId: true },
    })
    if (!current) return err('Branch not found.', 404)
    if (!current.addressId) return err('Branch has no address linked.', 500)

    // A tenant must always keep exactly one default branch, so clearing the
    // flag on the current default is rejected rather than silently ignored —
    // promote another branch instead.
    if (current.isDefault && input.isDefault === false) {
      return err('Set another branch as the default instead of clearing this one.', 409)
    }

    if (input.address) {
      const addressResult = await service.addresses.update(tenantId, current.addressId, input.address)
      if (!addressResult.success) {
        return addressResult
      }
    }

    // Now reload address to dual-write legacy columns
    const updatedAddressResult = await service.addresses.retrieve(tenantId, current.addressId)
    if (!updatedAddressResult) return err('Address linked to branch not found.', 500)

    const branch = await prisma.$transaction(async (tx) => {
      if (input.isDefault === true && !current.isDefault)
        await tx.branch.updateMany({
          where: { tenantId, isDefault: true },
          data: { isDefault: false, updatedAt: now },
        })

      return tx.branch.update({
        where: { id: current.id },
        data: {
          ...(input.name === undefined ? {} : { name: input.name }),
          ...(input.phone === undefined ? {} : { phone: input.phone }),
          ...(input.isDefault === undefined
            ? {}
            : { isDefault: input.isDefault }),
          ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
          ...(input.settings === undefined
            ? {}
            : { settings: input.settings as Prisma.InputJsonObject }),
          // Dual-write legacy postal columns (to be removed in PR 8)
          street1: updatedAddressResult.line1,
          street2: updatedAddressResult.line2,
          city: updatedAddressResult.city,
          parish: updatedAddressResult.regionName,
          country: updatedAddressResult.countryCode,
          updatedAt: now,
        },
        include: { address: true }
      })
    })

    return ok(branch)
  } catch (error) {
    if (isUniqueConstraintError(error))
      return err('A branch with that name already exists.', 409)

    console.error('[service.branches.update]', error)
    return err('Failed to update branch.', 500)
  }
}
