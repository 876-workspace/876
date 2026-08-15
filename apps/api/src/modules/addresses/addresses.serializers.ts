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
    userId: row.userId,
    organizationId: row.organizationId,
    type: addressType(row.type),
    label: row.label,
    line1: row.line1,
    line2: row.line2,
    city: row.city,
    regionId: row.regionId,
    countryCode: row.countryCode,
    postalCode: row.postalCode,
    isDefault: row.isDefault,
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
