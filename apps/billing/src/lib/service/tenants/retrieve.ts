import { prisma } from '@/lib/db'

export function retrieveByOrganizationId(organizationId: string) {
  return prisma.tenant.findUnique({ where: { organizationId } })
}

export function retrieveBySlug(slug: string) {
  return prisma.tenant.findUnique({ where: { slug } })
}

export function listByOrganizationIds(organizationIds: string[]) {
  if (organizationIds.length === 0) return []

  return prisma.tenant.findMany({
    where: { organizationId: { in: organizationIds } },
  })
}
