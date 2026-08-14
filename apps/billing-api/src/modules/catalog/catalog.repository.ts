import { prisma } from '@/db/client'

export function findCatalogTenantBySlug(slug: string) {
  return prisma.tenant.findUnique({ where: { slug }, select: { id: true } })
}
