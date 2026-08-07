import { prisma } from '@/db/client'

/**
 * Feature-specific queries that live in this module.
 *
 * The bulk of feature persistence is owned by `src/services/features.repository.ts`,
 * which the service layer calls directly. This file owns only the queries that
 * the Python router performed inline outside the FeatureService — the membership
 * check in `evaluate_my_features` and the enriched grant lists with identity
 * joins. Keeping them here preserves the rule that only `*.repository.ts` may
 * import `@/db/client` while the service stays injectable for tests.
 */

export function findMembership(
  organizationId: string,
  userId: string
): Promise<{ id: string; status: string } | null> {
  return prisma.membership.findFirst({
    where: { organizationId, userId, deletedAt: null },
    select: { id: true, status: true },
  })
}

export function listOrgGrantsWithOrg(featureId: string) {
  return prisma.orgFeature.findMany({
    where: { featureId },
    include: {
      organization: {
        select: { name: true, slug: true, logoUrl: true },
      },
      feature: { select: { slug: true } },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  })
}

export function listUserGrantsWithUser(featureId: string) {
  return prisma.userFeature.findMany({
    where: { featureId },
    include: {
      user: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
          username: true,
          avatar: true,
        },
      },
      feature: { select: { slug: true } },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  })
}
