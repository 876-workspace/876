import { prisma } from '@/lib/db'

/**
 * Remove a team member's access grant. Uses `deleteMany` so revoking access
 * for a user who has no grant is a safe no-op (no P2025 error).
 */
export function deleteMember(userId: string) {
  return prisma.member.deleteMany({ where: { userId } })
}
