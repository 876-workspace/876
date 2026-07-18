import { prisma } from '@/lib/db'

export function retrieve(id: string) {
  return prisma.tenant.findUnique({ where: { id } })
}

export function retrieveBySlug(slug: string) {
  return prisma.tenant.findUnique({ where: { slug } })
}

export function retrieveByOrgId(orgId: string) {
  return prisma.tenant.findUnique({
    where: { orgId },
    include: { domains: true },
  })
}

export function retrieveByHostname(hostname: string) {
  return prisma.domain.findUnique({
    where: { hostname },
    include: { tenant: true },
  })
}
