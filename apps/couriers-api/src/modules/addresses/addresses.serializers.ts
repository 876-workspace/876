import { fromDbUnixSeconds } from '@/platform/timestamps'

import type { Address } from './addresses.schemas'

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
