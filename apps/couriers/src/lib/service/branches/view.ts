import type { Address, Branch } from '@/lib/db'
import type { AddressView } from '@/types/address'
import type { BranchView } from '@/types/branch'

/**
 * Every branch read includes its address in one relation query — a branch list
 * must never issue an address query per row.
 */
export const BRANCH_WITH_ADDRESS = { include: { address: true } } as const

export type BranchWithAddress = Branch & { address: Address | null }

export function toAddressView(address: Address): AddressView {
  return address
}

/**
 * The relation is nullable during the expand stage only. Once the contract
 * migration lands, `address_id` is NOT NULL and this cannot be reached; it
 * throws rather than fabricating an empty address a caller would render.
 */
export function toBranchView(branch: BranchWithAddress): BranchView {
  if (!branch.address)
    throw new Error(`Branch ${branch.id} has no address relation.`)

  const { address, ...rest } = branch

  return {
    ...rest,
    addressId: address.id,
    settings: rest.settings as Record<string, unknown> | null,
    address: toAddressView(address),
  }
}
