import { prisma } from '@/db/client'

import type { TenantRow } from './tenants.serializers'

export async function findTenantById(id: string): Promise<TenantRow | null> {
  const row = await prisma.tenant.findUnique({ where: { id } })
  return row as TenantRow | null
}

export async function findTenantByOrgId(
  orgId: string
): Promise<TenantRow | null> {
  const row = await prisma.tenant.findUnique({ where: { orgId } })
  return row as TenantRow | null
}

export async function listTenants(options: {
  limit: number
  startingAfter?: string
  endingBefore?: string
}): Promise<TenantRow[]> {
  const rows = await prisma.tenant.findMany({
    take: options.limit + 1,
    where: options.startingAfter
      ? { id: { gt: options.startingAfter } }
      : options.endingBefore
        ? { id: { lt: options.endingBefore } }
        : undefined,
    orderBy: { id: options.endingBefore ? 'desc' : 'asc' },
  })
  return rows as TenantRow[]
}

export function countTenants(): Promise<number> {
  return prisma.tenant.count()
}

const DEFAULT_ROLES = [
  {
    systemKey: 'admin',
    name: 'Admin',
    description: 'Unrestricted access to every module.',
  },
  {
    systemKey: 'staff',
    name: 'Staff',
    description: 'Access to every module except Reports and Settings.',
  },
] as const

export async function createTenant(options: {
  orgId: string
  slug: string
  name: string
  ownerUserId?: string
  now: number
}): Promise<TenantRow> {
  return prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        orgId: options.orgId,
        slug: options.slug,
        name: options.name,
        status: 'ACTIVE',
        createdAt: options.now,
        updatedAt: options.now,
        domains: {
          create: {
            hostname: `${options.slug}.couriers.876.app`,
            isPrimary: true,
            verified: true,
            createdAt: options.now,
            updatedAt: options.now,
          },
        },
      },
    })
    const roles = await Promise.all(
      DEFAULT_ROLES.map((role) =>
        tx.role.create({
          data: {
            tenantId: tenant.id,
            systemKey: role.systemKey,
            name: role.name,
            description: role.description,
            permissions: [],
            createdAt: options.now,
            updatedAt: options.now,
          },
        })
      )
    )
    if (options.ownerUserId) {
      const admin = roles.find((role) => role.systemKey === 'admin')
      if (!admin) throw new Error('Admin role provisioning did not complete.')
      await tx.teamMember.create({
        data: {
          tenantId: tenant.id,
          userId: options.ownerUserId,
          roleId: admin.id,
          status: 'ACTIVE',
          createdAt: options.now,
          updatedAt: options.now,
        },
      })
    }
    return tenant as TenantRow
  })
}

export async function updateTenantMailboxPrefix(options: {
  id: string
  mailboxPrefix: string | null
  now: number
}): Promise<TenantRow> {
  const row = await prisma.tenant.update({
    where: { id: options.id },
    data: { mailboxPrefix: options.mailboxPrefix, updatedAt: options.now },
  })
  return row as TenantRow
}
