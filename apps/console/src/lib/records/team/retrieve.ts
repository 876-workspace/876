import { prisma } from '@/lib/db'

/** Get a single Console team member by their 876 user ID, with role included. */
export function retrieve(userId: string) {
  return prisma.member.findUnique({
    where: { userId },
    include: { role: true },
  })
}
