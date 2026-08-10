import { serializeAddress, type AddressRow } from '@/modules/addresses'
import { fromDbUnixSeconds } from '@/platform/timestamps'

import type {
  CustomerAddress,
  CustomerAddressType,
} from './customer-addresses.schemas'

export type CustomerAddressRow = {
  id: string
  tenantId: string
  customerId: string
  addressId: string
  type: CustomerAddressType
  isDefault: boolean
  createdAt: number | bigint
  updatedAt: number | bigint
  address: AddressRow | null
}

export function serializeCustomerAddress(
  row: CustomerAddressRow
): CustomerAddress {
  if (!row.address)
    throw new Error(`Customer address ${row.id} has no address relation.`)
  return {
    object: 'customer_address',
    id: row.id,
    tenant_id: row.tenantId,
    customer_id: row.customerId,
    address_id: row.addressId,
    type: row.type,
    is_default: row.isDefault,
    address: serializeAddress(row.address),
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}
