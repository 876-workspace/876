import { prisma } from '@/lib/db'
import type { WarehouseView } from '@/types/warehouse'

import { WAREHOUSE_WITH_ADDRESS, toWarehouseView } from './view'

export async function retrieve(params: {
  tenantId: string
  id: string
}): Promise<WarehouseView | null> {
  const warehouse = await prisma.warehouse.findFirst({
    where: { id: params.id, tenantId: params.tenantId },
    ...WAREHOUSE_WITH_ADDRESS,
  })

  return warehouse ? toWarehouseView(warehouse) : null
}
