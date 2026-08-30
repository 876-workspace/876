import { randomUUID } from 'node:crypto'

import { prisma } from '../../db/index.js'

export function retrieveByOrganization(organizationId: string) {
  return prisma.workTenant.findUnique({ where: { organizationId } })
}

export async function tenantAuthorizationByOrganizationId(
  organizationId: string
) {
  const tenant = await retrieveByOrganization(organizationId)
  return tenant ? { id: tenant.id, active: tenant.status === 'ACTIVE' } : null
}

export async function ensure(organizationId: string) {
  const existing = await retrieveByOrganization(organizationId)
  if (existing) return existing

  try {
    return await prisma.workTenant.create({
      data: {
        id: `work_tnt_${randomUUID().replaceAll('-', '')}`,
        organizationId,
      },
    })
  } catch (error) {
    if ((error as { code?: string }).code !== 'P2002') throw error
    const winner = await retrieveByOrganization(organizationId)
    if (!winner) throw error
    return winner
  }
}
