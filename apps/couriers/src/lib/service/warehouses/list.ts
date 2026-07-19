import { prisma } from '@/lib/db'
import type { WarehouseListParams } from '@/types/warehouse'

export function list(params: WarehouseListParams) {
  return prisma.warehouse.findMany({
    where: { tenantId: params.tenantId },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
  })
}
