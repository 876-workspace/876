import { nowUnixSeconds } from '@876/core/timestamps'

import type { Prisma } from '@/lib/db'
import {
  branchCreateParamsSchema,
  type BranchCreateParams,
  type BranchView,
} from '@/types/branch'
import type { ServiceResult } from '@/types/api'

import { buildAddressData } from '../addresses/create'
import { isUniqueConstraintError } from '../prisma-errors'
import { reportServiceFailure } from '../report'
import { ok, err, errFrom } from '../result'
import { isColdStartError, runTransaction } from '../transaction'
import { scheduleSync } from '../org-locations/sync'
import { toBranchView } from './view'

export async function create(
  tenantId: string,
  orgId: string,
  params: BranchCreateParams
): ServiceResult<BranchView> {
  const parsed = branchCreateParamsSchema.safeParse(params)
  if (!parsed.success)
    return err(parsed.error.issues[0]?.message ?? 'Invalid branch.', 400)

  const input = parsed.data

  // Geography is resolved before the transaction opens, so a rejected region
  // never holds a write transaction open across a platform call.
  const address = await buildAddressData(tenantId, {
    ...input.address,
    // A branch form names the branch, not its address; reuse that name unless
    // the address was given one of its own.
    name: input.address.name?.trim() || input.name,
  })
  if (!address.ok) return address.result

  const now = nowUnixSeconds()

  try {
    const branch = await runTransaction('branches.create', async (tx) => {
      // A tenant's first branch is its default regardless of what was requested,
      // so customers and packages always have a location to route to.
      const count = await tx.branch.count({ where: { tenantId } })
      const isDefault = count === 0 || input.isDefault === true

      if (isDefault && count > 0)
        await tx.branch.updateMany({
          where: { tenantId, isDefault: true },
          data: { isDefault: false, updatedAt: now },
        })

      const created = await tx.address.create({ data: address.data })

      return tx.branch.create({
        data: {
          tenantId,
          addressId: created.id,
          name: input.name,
          phone: input.phone ?? null,
          isDefault,
          isActive: input.isActive ?? true,
          settings: (input.settings ?? undefined) as
            | Prisma.InputJsonObject
            | undefined,
          createdAt: now,
          updatedAt: now,
        },
        include: { address: true },
      })
    })

    const view = toBranchView(branch)
    scheduleSync(orgId, {
      kind: 'branch',
      id: view.id,
      orgLocationId: view.orgLocationId,
      name: view.name,
      phone: view.phone,
      isActive: view.isActive,
      isDefaultForKind: view.isDefault,
      address: view.address,
    })

    return ok(view)
  } catch (error) {
    // The address write is inside the transaction, so a duplicate branch name
    // rolls it back rather than leaving an orphan address behind.
    if (isUniqueConstraintError(error))
      return err('A branch with that name already exists.', 409)

    if (isColdStartError(error)) {
      reportServiceFailure(error, {
        operation: 'branches.create',
        consequence:
          'The branch was not created and the form asks the user to try again shortly.',
      })
      return errFrom('error/database-unavailable')
    }

    console.error('[service.branches.create]', error)
    reportServiceFailure(error, {
      operation: 'branches.create',
      consequence:
        'The branch was not created and the form shows a generic failure.',
    })
    return err('Failed to create branch.', 500)
  }
}
