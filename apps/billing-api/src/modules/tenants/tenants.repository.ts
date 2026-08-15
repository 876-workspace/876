import { prisma } from '@/db/client'
import { generateId } from '@/platform/ids'

export async function findTenantAuthorizationByOrganizationId(
  organizationId: string
) {
  return prisma.tenant.findUnique({
    where: { organizationId },
    select: { id: true, status: true },
  })
}

export function findTenantRow(id: string) {
  return prisma.tenant.findUnique({ where: { id } })
}

export function listTenantRowsByOrganizationIds(organizationIds: string[]) {
  if (organizationIds.length === 0) return Promise.resolve([])
  return prisma.tenant.findMany({
    where: { organizationId: { in: organizationIds } },
    orderBy: { createdAt: 'asc' },
  })
}

export async function provisionTenantRow(input: {
  organizationId: string
  userId: string
  name: string
  slug: string
  now: number
}) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.tenant.findUnique({
      where: { organizationId: input.organizationId },
    })
    if (existing)
      return {
        id: existing.id,
        created: false,
        provisioningVersion: existing.provisioningVersion,
      }

    const tenantId = generateId('Tenant')
    const ownerRoleId = generateId('Role')
    const tenant = await tx.tenant.create({
      data: {
        id: tenantId,
        organizationId: input.organizationId,
        slug: input.slug,
        name: input.name,
        countryCode: 'JM',
        status: 'ACTIVE',
        defaultCurrency: 'JMD',
        defaultLanguage: 'en',
        provisioningVersion: 3,
        provisionedAt: input.now,
        createdAt: input.now,
        updatedAt: input.now,
      },
    })
    await tx.tenantCurrency.create({
      data: {
        tenantId,
        currencyCode: 'JMD',
        isDefault: true,
        isEnabled: true,
        createdAt: input.now,
        updatedAt: input.now,
      },
    })
    await tx.role.create({
      data: {
        id: ownerRoleId,
        tenantId,
        slug: 'owner',
        name: 'Owner',
        description:
          'Unrestricted workspace access, including roles and member grants.',
        permissions: [
          'billing:access',
          'dashboard:read',
          'customers:read',
          'customers:write',
          'catalog:read',
          'catalog:write',
          'sales:read',
          'sales:write',
          'subscriptions:read',
          'subscriptions:write',
          'reports:read',
          'settings:read',
          'currencies:read',
          'currencies:write',
          'taxes:read',
          'taxes:write',
          'members:read',
          'members:write',
          'roles:read',
          'roles:write',
          'vendors:read',
          'vendors:write',
          'purchases:read',
          'purchases:write',
          'banking:read',
          'banking:write',
          'payments:read',
          'payments:write',
        ],
        isSystem: true,
        isDefault: false,
        createdAt: input.now,
        updatedAt: input.now,
      },
    })
    await tx.member.create({
      data: {
        id: generateId('Member'),
        tenantId,
        userId: input.userId,
        roleId: ownerRoleId,
        status: 'ACTIVE',
        createdAt: input.now,
        updatedAt: input.now,
      },
    })
    return {
      id: tenant.id,
      created: true,
      provisioningVersion: tenant.provisioningVersion,
    }
  })
}
