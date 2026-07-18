import { prisma } from '@/lib/db'

/** Retrieves one tenant-owned vendor and its activity totals. */
export function retrieve(tenantId: string, vendorId: string) {
  return prisma.vendor.findFirst({
    where: { id: vendorId, tenantId },
  })
}
