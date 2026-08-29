import { prisma } from '@/lib/db'

export type TeamGrantStatus = 'active' | 'suspended' | 'expired'

/**
 * List Console access grants, ordered by join date. Expiry is derived from the
 * grant timestamp rather than persisted as a third lifecycle status.
 */
export function list(options?: { status?: TeamGrantStatus }) {
  const now = BigInt(Math.floor(Date.now() / 1000))
  const status = options?.status

  const where =
    status === 'expired'
      ? { expiresAt: { lte: now } }
      : status === 'active'
        ? {
            status: 'active',
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          }
        : status === 'suspended'
          ? { status: 'suspended' }
          : undefined

  return prisma.member.findMany({
    where,
    include: { role: true },
    orderBy: { createdAt: 'asc' },
  })
}
