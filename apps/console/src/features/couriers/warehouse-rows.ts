import type { Warehouse } from '@876/couriers/admin'

/** An overseas warehouse as an operator reads one. */
export interface CouriersWarehouseRow {
  id: string
  name: string
  /** The tenant's short code for the warehouse, when it set one. */
  code: string | null
  operatingModel: string
  /** The third party operating it, present only for an `AGENT` warehouse. */
  agentName: string | null
  city: string
  countryCode: string
  isPrimary: boolean
  isActive: boolean
}

export function toWarehouseRows(
  warehouses: readonly Warehouse[]
): CouriersWarehouseRow[] {
  return warehouses.map((warehouse) => ({
    id: warehouse.id,
    name: warehouse.name,
    code: warehouse.code,
    operatingModel: warehouse.operating_model,
    agentName: warehouse.agent_name,
    city: warehouse.address.city,
    countryCode: warehouse.address.country_code,
    isPrimary: warehouse.is_primary,
    isActive: warehouse.is_active,
  }))
}
