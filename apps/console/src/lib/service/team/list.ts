import { prisma } from '@/lib/db'

/** List all Console team members, ordered by join date, with roles included. */
export function list() {
  return prisma.member.findMany({
    include: { role: true },
    orderBy: { createdAt: 'asc' },
  })
}
