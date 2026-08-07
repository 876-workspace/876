import { fromDbUnixSeconds } from '@/platform/timestamps'

import {
  ADDRESS_TYPES,
  type Address,
  type AddressType,
} from './addresses.schemas'

export type AddressRow = {
  id: string
  userId: string | null
  organizationId: string | null
  type: string
  label: string | null
  line1: string | null
  line2: string | null
  city: string | null
  regionId: string | null
  countryCode: string | null
  postalCode: string | null
  isDefault: boolean
  createdAt: bigint
  updatedAt: bigint
}

/**
 * The column is a free-text VarChar with a default of 'other', so a row can hold
 * a value outside the enum. Anything unrecognised serializes as 'other' rather
 * than breaking the response contract for every caller.
 */
function addressType(value: string): AddressType {
  return (ADDRESS_TYPES as readonly string[]).includes(value)
    ? (value as AddressType)
    : 'other'
}

export function serializeAddress(row: AddressRow): Address {
  return {
    object: 'address',
    id: row.id,
    user_id: row.userId,
    organization_id: row.organizationId,
    type: addressType(row.type),
    label: row.label,
    line1: row.line1,
    line2: row.line2,
    city: row.city,
    region_id: row.regionId,
    country_code: row.countryCode,
    postal_code: row.postalCode,
    is_default: row.isDefault,
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}
