import { fromDbUnixSeconds } from '@/platform/timestamps'

import type { Address, Branch } from './branches.schemas'

export type AddressRow = {
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

export type BranchRow = {
  id: string
  tenantId: string
  addressId: string
  orgLocationId: string | null
  name: string
  phone: string | null
  isDefault: boolean
  isActive: boolean
  settings: unknown
  createdAt: number | bigint
  updatedAt: number | bigint
  address: AddressRow | null
}

export function serializeAddress(row: AddressRow): Address {
  return {
    object: 'address',
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

export function serializeBranch(row: BranchRow): Branch {
  if (!row.address) throw new Error(`Branch ${row.id} has no address relation.`)

  return {
    object: 'branch',
    id: row.id,
    tenant_id: row.tenantId,
    address_id: row.addressId,
    org_location_id: row.orgLocationId,
    name: row.name,
    phone: row.phone,
    is_default: row.isDefault,
    is_active: row.isActive,
    settings: isRecord(row.settings) ? row.settings : null,
    address: serializeAddress(row.address),
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
