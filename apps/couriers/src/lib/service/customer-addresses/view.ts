import type { Address, CustomerAddress } from '@/lib/db'
import type { CustomerAddressView } from '@/types/customer-address'

/** Every read includes the address in one relation query, never one per row. */
export const CUSTOMER_ADDRESS_WITH_ADDRESS = {
  include: { address: true },
} as const

export type CustomerAddressWithAddress = CustomerAddress & { address: Address }

export function toCustomerAddressView(
  row: CustomerAddressWithAddress
): CustomerAddressView {
  return row
}
