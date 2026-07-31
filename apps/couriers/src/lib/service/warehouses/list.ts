import { prisma } from '@/lib/db'
import type { WarehouseListParams, WarehouseView } from '@/types/warehouse'

import { WAREHOUSE_WITH_ADDRESS, toWarehouseView } from './view'

export async function list(
  params: WarehouseListParams
): Promise<WarehouseView[]> {
  const warehouses = await prisma.warehouse.findMany({
    where: { tenantId: params.tenantId },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
    ...WAREHOUSE_WITH_ADDRESS,
  })

  return warehouses.map(toWarehouseView)
}
