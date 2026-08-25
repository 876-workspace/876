import { randomUUID } from 'node:crypto'

import { prisma } from '@/db/index.js'

export function retrieveByOrganization(organizationId: string) {
  return prisma.tenant.findUnique({ where: { organizationId } })
}

export async function ensure(organizationId: string) {
  const existing = await retrieveByOrganization(organizationId)
  if (existing) return existing

  try {
    return await prisma.tenant.create({
      data: {
        id: `crm_tnt_${randomUUID().replaceAll('-', '')}`,
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
