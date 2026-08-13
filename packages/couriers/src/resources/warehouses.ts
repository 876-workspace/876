import { SessionRequest } from '../session-request'
import type { Runtime } from '../runtime'
import {
  warehouseListSchema,
  warehouseSchema,
  type CreateWarehouseBody,
  type UpdateWarehouseBody,
  type Warehouse,
  type WarehouseList,
} from '../admin/types/warehouse.schema'

export function createWarehousesResource(runtime: Runtime) {
  const path = '/v1/me/warehouses'
  return {
    list(params: Record<string, unknown> = {}) {
      return SessionRequest<WarehouseList>(
        runtime,
        { method: 'GET', path, query: params as never },
        warehouseListSchema
      )
    },
    retrieve(id: string) {
      return SessionRequest<Warehouse>(
        runtime,
        { method: 'GET', path: `${path}/${encodeURIComponent(id)}` },
        warehouseSchema
      )
    },
    create(body: CreateWarehouseBody) {
      return SessionRequest<Warehouse>(
        runtime,
        { method: 'POST', path, body },
        warehouseSchema
      )
    },
    update(id: string, body: UpdateWarehouseBody) {
      return SessionRequest<Warehouse>(
        runtime,
        { method: 'PATCH', path: `${path}/${encodeURIComponent(id)}`, body },
        warehouseSchema
      )
    },
  }
}
