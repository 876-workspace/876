import { AdminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import {
  warehouseListSchema,
  warehouseSchema,
  type CreateWarehouseBody,
  type UpdateWarehouseBody,
  type Warehouse,
  type WarehouseList,
} from '../types/warehouse.schema'

export function createWarehousesResource(runtime: AdminRuntime) {
  const path = (tenantId: string) =>
    `/v1/tenants/${encodeURIComponent(tenantId)}/warehouses`

  return {
    list(tenantId: string) {
      return AdminRequest<WarehouseList>(
        runtime,
        { method: 'GET', path: path(tenantId) },
        warehouseListSchema
      )
    },

    retrieve(tenantId: string, id: string) {
      return AdminRequest<Warehouse>(
        runtime,
        { method: 'GET', path: `${path(tenantId)}/${encodeURIComponent(id)}` },
        warehouseSchema
      )
    },

    create(tenantId: string, body: CreateWarehouseBody) {
      return AdminRequest<Warehouse>(
        runtime,
        { method: 'POST', path: path(tenantId), body },
        warehouseSchema
      )
    },

    update(tenantId: string, id: string, body: UpdateWarehouseBody) {
      return AdminRequest<Warehouse>(
        runtime,
        {
          method: 'PATCH',
          path: `${path(tenantId)}/${encodeURIComponent(id)}`,
          body,
        },
        warehouseSchema
      )
    },
  }
}
