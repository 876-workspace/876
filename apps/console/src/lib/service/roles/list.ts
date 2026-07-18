import { prisma } from '@/lib/db'

/** List all roles, with member counts included. */
export function list() {
  return prisma.role.findMany({
    include: { _count: { select: { members: true } } },
  })
}
