import { prisma } from '@/lib/db'

/** Retrieves the workspace invoice and late-fee defaults. */
export function retrieve(tenantId: string) {
  return prisma.invoicePreference.findUnique({ where: { tenantId } })
}
