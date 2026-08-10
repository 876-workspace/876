import { prisma } from '@/lib/db'

export function retrieve(
  params:
    | { organizationId: string; slug?: never }
    | { slug: string; organizationId?: never }
) {
  if ('organizationId' in params) {
    return prisma.tenant.findUnique({
      where: { organizationId: params.organizationId },
    })
  }
  return prisma.tenant.findUnique({ where: { slug: params.slug } })
}

export function list(params: { organizationIds: string[] }) {
  if (params.organizationIds.length === 0) return []
  return prisma.tenant.findMany({
    where: { organizationId: { in: params.organizationIds } },
  })
}
