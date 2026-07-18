import { prisma } from '@/lib/db'

/**
 * Grant a user Console access with the given role. Fails (P2002) if the user
 * already has a grant — use `update` to change an existing member's role.
 */
export function create(userId: string, roleName: string) {
  return prisma.member.create({
    data: { userId, roleName, status: 'active' },
  })
}
