import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma, type Prisma } from '@/lib/db'
import {
  branchUpdateParamsSchema,
  type BranchUpdateParams,
  type BranchView,
} from '@/types/branch'
import type { ServiceResult } from '@/types/api'

import { buildAddressUpdateData } from '../addresses/update'
import { isUniqueConstraintError } from '../prisma-errors'
import { ok, err } from '../result'
import { toBranchView } from './view'

class DefaultBranchError extends Error {}

export async function update(
  tenantId: string,
  id: string,
  params: BranchUpdateParams
): ServiceResult<BranchView> {
  const parsed = branchUpdateParamsSchema.safeParse(params)
  if (!parsed.success)
    return err(parsed.error.issues[0]?.message ?? 'Invalid branch.', 400)

  const input = parsed.data

  const current = await prisma.branch.findFirst({
    where: { id, tenantId },
    select: {
      id: true,
      isDefault: true,
      addressId: true,
      address: { select: { countryCode: true, regionCode: true } },
    },
  })
  if (!current) return err('Branch not found.', 404)

  // Resolved outside the transaction for the same reason as create.
  let addressData: Prisma.AddressUncheckedUpdateInput | undefined
  if (input.address) {
    if (!current.address || !current.addressId)
      return err('Branch not found.', 404)

    const built = await buildAddressUpdateData(current.address, input.address)
    if (!built.ok) return built.result
    addressData = built.data
  }

  const now = nowUnixSeconds()

  try {
    const branch = await prisma.$transaction(async (tx) => {
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

      if (addressData && current.addressId)
        await tx.address.update({
          where: { id: current.addressId },
          data: addressData,
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
          updatedAt: now,
        },
        include: { address: true },
      })
    })

    return ok(toBranchView(branch))
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
