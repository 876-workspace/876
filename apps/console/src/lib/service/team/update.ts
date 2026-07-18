import { prisma } from '@/lib/db'

/**
 * Update an existing team member's access grant. Fails (P2025) if the user
 * has no grant — use `create` to grant access.
 */
export function update(userId: string, data: { roleName: string }) {
  return prisma.member.update({ where: { userId }, data })
}
