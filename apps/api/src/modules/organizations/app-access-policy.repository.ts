import { prisma } from '@/db/client'

export function findPolicyMembership(organizationId: string, userId: string) {
  return prisma.membership.findFirst({
    where: { organizationId, userId, deletedAt: null },
    select: { id: true, role: true, roleId: true, status: true },
  })
}

export function findPolicyRole(organizationId: string, roleId: string) {
  return prisma.organizationRole.findFirst({
    where: { id: roleId, organizationId },
    select: { permissions: true },
  })
}

export function findAppEntitlement(organizationId: string, appId: string) {
  return prisma.subscription.findFirst({
    where: { organizationId, appId },
    select: { appId: true, status: true },
  })
}

export function listAppEntitlements(organizationId: string) {
  return prisma.subscription.findMany({
    where: { organizationId },
    select: { appId: true, status: true },
  })
}
