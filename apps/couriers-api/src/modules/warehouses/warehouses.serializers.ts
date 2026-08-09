import { fromDbUnixSeconds } from '@/platform/timestamps'

import type { Warehouse } from './warehouses.schemas'

export type WarehouseRow = {
  id: string
  tenantId: string
  addressId: string
  orgLocationId: string | null
  name: string
  operatingModel: 'OWNED' | 'AGENT'
  agentName: string | null
  code: string | null
  mailboxPlacement: 'RECIPIENT_LINE' | 'ADDRESS_LINE_1' | 'ADDRESS_LINE_2'
  mailboxPrefix: string | null
  instructions: string | null
  isActive: boolean
  isPrimary: boolean
  createdAt: number | bigint
  updatedAt: number | bigint
  address: AddressRow | null
}

type AddressRow = {
  id: string
  tenantId: string
  name: string
  line1: string
  line2: string | null
  city: string
  regionCode: string | null
  regionName: string | null
  countryCode: string
  postalCode: string | null
  latitude: number | null
  longitude: number | null
  isActive: boolean
  createdAt: number | bigint
  updatedAt: number | bigint
}

function serializeAddress(row: AddressRow) {
  return {
    object: 'address' as const,
    id: row.id,
    tenant_id: row.tenantId,
    name: row.name,
    line1: row.line1,
    line2: row.line2,
    city: row.city,
    region_code: row.regionCode,
    region_name: row.regionName,
    country_code: row.countryCode,
    postal_code: row.postalCode,
    latitude: row.latitude,
    longitude: row.longitude,
    is_active: row.isActive,
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeWarehouse(row: WarehouseRow): Warehouse {
  if (!row.address)
    throw new Error(`Warehouse ${row.id} has no address relation.`)
  return {
    object: 'warehouse',
    id: row.id,
    tenant_id: row.tenantId,
    address_id: row.addressId,
    org_location_id: row.orgLocationId,
    name: row.name,
    operating_model: row.operatingModel,
    agent_name: row.agentName,
    code: row.code,
    mailbox_placement: row.mailboxPlacement,
    mailbox_prefix: row.mailboxPrefix,
    instructions: row.instructions,
    is_active: row.isActive,
    is_primary: row.isPrimary,
    address: serializeAddress(row.address),
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}
