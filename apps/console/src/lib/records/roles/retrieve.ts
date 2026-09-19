import { prisma } from '@/lib/db'

/** Get a single role by name, with member count included. */
export function retrieve(name: string) {
  return prisma.role.findUnique({
    where: { name },
    include: { _count: { select: { members: true } } },
  })
}
