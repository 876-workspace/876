import { prisma } from '@/lib/db'

/** Retrieves one tenant-owned credit note with its lines and applications. */
export function retrieve(tenantId: string, creditNoteId: string) {
  return prisma.creditNote.findFirst({
    where: { id: creditNoteId, tenantId },
    include: {
      customer: { select: { id: true, name: true } },
      lines: true,
      allocations: { where: { reversedAt: null } },
      refunds: true,
    },
  })
}
