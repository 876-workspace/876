import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma, type PrismaTransactionClient } from '@/lib/db'
import { resolveRegionById } from '@/lib/geo/resolve-region'
import type { DefaultBranchAddress } from '@/types/branch'

import { isUniqueConstraintError } from '../prisma-errors'

/** Name given to the branch seeded from the organization's own address. */
export const DEFAULT_BRANCH_NAME = 'Main branch'

/**
 * An organization address with its geography already resolved against the
 * platform catalog. Produced by {@link resolveDefaultBranchAddress}.
 */
export type ResolvedDefaultBranchAddress = DefaultBranchAddress & {
  regionCode: string | null
  regionName: string | null
}

/**
 * Resolves the organization's core `regionId` to a canonical region code and
 * display name.
 *
 * Call this *before* opening a transaction: it performs a platform request, and
 * holding a write transaction open across a network call is what turns a slow
 * catalog into database lock contention. A region that cannot be resolved is
 * dropped rather than guessed — the rest of the address is still usable.
 */
export async function resolveDefaultBranchAddress(
  address: DefaultBranchAddress | null
): Promise<ResolvedDefaultBranchAddress | null> {
  if (!address) return null

  const countryCode = address.countryCode?.trim().toUpperCase() || 'JM'
  if (!address.regionId)
    return { ...address, regionCode: null, regionName: null }

  const region = await resolveRegionById(countryCode, address.regionId)

  return {
    ...address,
    regionCode: region?.regionCode ?? null,
    regionName: region?.regionName ?? null,
  }
}

/**
 * Seeds a tenant's first branch, and the address it occupies, from the
 * organization's registered address — so a single-location courier never has to
 * create one by hand before customers can be assigned a pickup location.
 *
 * Returns the id of the branch that ended up being the default, or null when
 * none could be seeded.
 *
 * Deliberately conservative:
 * - It never invents address data. An organization with no usable address gets
 *   no branch, and the settings readiness check surfaces it as a recommended
 *   task instead. A fabricated pickup address is worse than a missing one —
 *   customers would be sent to it.
 * - It is idempotent. A tenant that already has any branch is left untouched,
 *   so this can run on every provisioning path without ever producing a second
 *   default or overwriting an address the org has since corrected.
 */
export async function ensureDefault(
  tenantId: string,
  address: ResolvedDefaultBranchAddress | null,
  tx?: PrismaTransactionClient
): Promise<string | null> {
  // The address and the branch are two writes, so when the caller has no
  // transaction of its own one is opened here — a branch must never be left
  // pointing at nothing, nor an address orphaned by a failed branch insert.
  if (tx) return seedDefault(tenantId, address, tx)

  return prisma.$transaction((client) => seedDefault(tenantId, address, client))
}

async function seedDefault(
  tenantId: string,
  address: ResolvedDefaultBranchAddress | null,
  client: PrismaTransactionClient
): Promise<string | null> {
  const existing = await client.branch.findFirst({
    where: { tenantId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    select: { id: true },
  })
  if (existing) return existing.id

  // line1 and city are non-null on Address, so an address missing either cannot
  // produce a usable pickup location.
  if (!address?.line1?.trim() || !address.city?.trim()) return null

  const now = nowUnixSeconds()

  try {
    // Written as two statements rather than a nested create because the branch
    // references its address through the composite (id, tenant_id) key, which
    // Prisma cannot satisfy with a nested write. The caller's transaction — or
    // the one opened below — is what keeps them atomic.
    const createdAddress = await client.address.create({
      data: {
        tenantId,
        name: DEFAULT_BRANCH_NAME,
        line1: address.line1.trim(),
        line2: address.line2?.trim() || null,
        city: address.city.trim(),
        countryCode: address.countryCode?.trim().toUpperCase() || 'JM',
        regionCode: address.regionCode,
        regionName: address.regionName,
        postalCode: address.postalCode?.trim() || null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      select: { id: true },
    })

    const created = await client.branch.create({
      data: {
        tenantId,
        addressId: createdAddress.id,
        name: DEFAULT_BRANCH_NAME,
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
