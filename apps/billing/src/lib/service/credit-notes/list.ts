import { prisma } from '@/lib/db'
import type { CreditNoteStatus } from '@/lib/db'

/** Lists a tenant's credit notes, most recent first. */
export function listCreditNotes(tenantId: string, status?: CreditNoteStatus) {
  return prisma.creditNote.findMany({
    where: { tenantId, ...(status ? { status } : {}) },
    include: { customer: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  })
}
