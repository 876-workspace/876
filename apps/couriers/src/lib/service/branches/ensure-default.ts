import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma, type PrismaTransactionClient } from '@/lib/db'
import type { DefaultBranchAddress } from '@/types/branch'

import { isUniqueConstraintError } from '../prisma-errors'

/** Name given to the branch seeded from the organization's own address. */
export const DEFAULT_BRANCH_NAME = 'Main branch'

/**
 * Seeds a tenant's first branch from the organization's registered address, so a
 * single-location courier never has to create one by hand before customers can be
 * assigned a pickup location.
 *
 * Returns the id of the branch that ended up being the default, or null when none
 * could be seeded.
 *
 * Deliberately conservative:
 * - It never invents address data. An organization with no usable address gets no
 *   branch, and the settings readiness check surfaces it as a recommended task
 *   instead. A fabricated pickup address is worse than a missing one — customers
 *   would be sent to it.
 * - It is idempotent. A tenant that already has any branch is left untouched, so
 *   this can run on every provisioning path without ever producing a second
 *   default or overwriting an address the org has since corrected.
 */
export async function ensureDefault(
  tenantId: string,
  address: DefaultBranchAddress | null,
  tx?: PrismaTransactionClient
): Promise<string | null> {
  const client = tx ?? prisma

  const existing = await client.branch.findFirst({
    where: { tenantId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    select: { id: true },
  })
  if (existing) return existing.id

  // street1 and city are non-null on Branch, so an address missing either cannot
  // produce a usable pickup location.
  if (!address?.street1?.trim() || !address.city?.trim()) return null

  const now = nowUnixSeconds()

  try {
    const created = await client.branch.create({
      data: {
        tenantId,
        name: DEFAULT_BRANCH_NAME,
        street1: address.street1.trim(),
        street2: address.street2?.trim() || null,
        city: address.city.trim(),
        parish: address.parish?.trim() || null,
        country: address.country?.trim() || 'JM',
        phone: address.phone?.trim() || null,
        isDefault: true,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      select: { id: true },
    })

    return created.id
  } catch (error) {
    // A concurrent provisioning call may have seeded this branch already; the
    // (tenantId, name) unique constraint is what makes that safe to swallow.
    if (!isUniqueConstraintError(error)) throw error

    const raced = await client.branch.findFirst({
      where: { tenantId, name: DEFAULT_BRANCH_NAME },
      select: { id: true },
    })

    return raced?.id ?? null
  }
}
