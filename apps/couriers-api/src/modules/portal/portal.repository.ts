import { prisma } from '@/db/client'

export function findActivePortalTenantByHostname(hostname: string) {
  return prisma.domain.findFirst({
    where: {
      hostname,
      verified: true,
      tenant: { status: 'ACTIVE' },
    },
    include: { tenant: true },
  })
}

export function findActivePortalTenantBySlug(slug: string) {
  return prisma.tenant.findFirst({ where: { slug, status: 'ACTIVE' } })
}

export async function findPortalShippingAddress(options: {
  tenantId: string
  customerId: string
}) {
  const [warehouse, mailbox] = await Promise.all([
    prisma.warehouse.findFirst({
      where: { tenantId: options.tenantId, isActive: true },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
      include: { address: true },
    }),
    prisma.mailbox.findFirst({
      where: { tenantId: options.tenantId, customerId: options.customerId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
    }),
  ])
  return { warehouse, mailbox }
}
