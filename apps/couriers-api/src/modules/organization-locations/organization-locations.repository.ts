import { prisma } from '@/db/client'

export type OrganizationLocationAddressRow = {
  line1: string
  line2: string | null
  city: string
  regionCode: string | null
  countryCode: string
  postalCode: string | null
}

export type OrganizationLocationSiteRow = {
  kind: 'branch' | 'warehouse'
  id: string
  orgLocationId: string | null
  name: string
  phone: string | null
  isActive: boolean
  isDefaultForKind: boolean
  address: OrganizationLocationAddressRow | null
}

type TenantRow = { id: string; orgId: string }

const withAddress = { include: { address: true } } as const
const RECONCILE_LIMIT = 25

export async function findTenant(tenantId: string): Promise<TenantRow | null> {
  const row = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, orgId: true },
  })
  return row as TenantRow | null
}

export async function findSite(options: {
  tenantId: string
  kind: 'branch' | 'warehouse'
  id: string
}): Promise<OrganizationLocationSiteRow | null> {
  if (options.kind === 'branch') {
    const row = await prisma.branch.findFirst({
      where: { tenantId: options.tenantId, id: options.id },
      ...withAddress,
    })
    return row
      ? {
          kind: 'branch',
          id: row.id,
          orgLocationId: row.orgLocationId,
          name: row.name,
          phone: row.phone,
          isActive: row.isActive,
          isDefaultForKind: row.isDefault,
          address: row.address,
        }
      : null
  }

  const row = await prisma.warehouse.findFirst({
    where: { tenantId: options.tenantId, id: options.id },
    ...withAddress,
  })
  return row
    ? {
        kind: 'warehouse',
        id: row.id,
        orgLocationId: row.orgLocationId,
        name: row.name,
        phone: null,
        isActive: row.isActive,
        isDefaultForKind: row.isPrimary,
        address: row.address,
      }
    : null
}

/** Lists a bounded, branch-first batch of sites that have never been linked. */
export async function listUnlinkedSites(
  tenantId: string
): Promise<OrganizationLocationSiteRow[]> {
  const branches = await prisma.branch.findMany({
    where: { tenantId, orgLocationId: null },
    take: RECONCILE_LIMIT,
    ...withAddress,
  })

  const remaining = RECONCILE_LIMIT - branches.length
  const warehouses =
    remaining === 0
      ? []
      : await prisma.warehouse.findMany({
          where: { tenantId, orgLocationId: null },
          take: remaining,
          ...withAddress,
        })

  return [
    ...branches.map((row) => ({
      kind: 'branch' as const,
      id: row.id,
      orgLocationId: row.orgLocationId,
      name: row.name,
      phone: row.phone,
      isActive: row.isActive,
      isDefaultForKind: row.isDefault,
      address: row.address,
    })),
    ...warehouses.map((row) => ({
      kind: 'warehouse' as const,
      id: row.id,
      orgLocationId: row.orgLocationId,
      name: row.name,
      phone: null,
      isActive: row.isActive,
      isDefaultForKind: row.isPrimary,
      address: row.address,
    })),
  ]
}

export async function linkSite(options: {
  tenantId: string
  kind: 'branch' | 'warehouse'
  id: string
  orgLocationId: string
}): Promise<void> {
  if (options.kind === 'branch') {
    const result = await prisma.branch.updateMany({
      where: { tenantId: options.tenantId, id: options.id },
      data: { orgLocationId: options.orgLocationId },
    })
    if (result.count !== 1)
      throw new Error(`Branch ${options.id} is no longer available to link.`)
    return
  }

  const result = await prisma.warehouse.updateMany({
    where: { tenantId: options.tenantId, id: options.id },
    data: { orgLocationId: options.orgLocationId },
  })
  if (result.count !== 1)
    throw new Error(`Warehouse ${options.id} is no longer available to link.`)
}
