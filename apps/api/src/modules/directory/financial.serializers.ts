/**
 * Row → API resource for the financial directory.
 *
 * Every timestamp column is Prisma `BigInt`; one reaching `JSON.stringify`
 * throws at runtime, so each goes through `fromDbUnixSeconds`.
 */

import { fromDbUnixSeconds } from '@/platform/timestamps'

import {
  DIRECTORY_ADDRESS_SELECT,
  serializeDirectoryAddress,
  type DirectoryAddressRow,
} from './directory.serializers'
import type {
  Bank,
  BankAccount,
  BankBranch,
  CreditUnion,
  CreditUnionBranch,
} from './financial.schemas'

export type BankRow = {
  id: string
  name: string
  shortName: string | null
  bankCode: string
  swiftCode: string | null
  logoUrl: string | null
  headOffice: string | null
  website: string | null
  createdAt: bigint
  updatedAt: bigint
}

export const BANK_SELECT = {
  id: true,
  name: true,
  shortName: true,
  bankCode: true,
  swiftCode: true,
  logoUrl: true,
  headOffice: true,
  website: true,
  createdAt: true,
  updatedAt: true,
} as const

export function serializeBank(row: BankRow): Bank {
  return {
    object: 'bank',
    id: row.id,
    name: row.name,
    short_name: row.shortName,
    bank_code: row.bankCode,
    swift_code: row.swiftCode,
    logo_url: row.logoUrl,
    head_office: row.headOffice,
    website: row.website,
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}

export type BankBranchRow = {
  id: string
  bankId: string
  name: string
  transitNumber: string
  routingNumber: string | null
  addressId: string
  contactNumber: string | null
  operatingHours: string | null
  createdAt: bigint
  updatedAt: bigint
  directoryAddress: DirectoryAddressRow
}

export const BANK_BRANCH_SELECT = {
  id: true,
  bankId: true,
  name: true,
  transitNumber: true,
  routingNumber: true,
  addressId: true,
  contactNumber: true,
  operatingHours: true,
  createdAt: true,
  updatedAt: true,
  directoryAddress: { select: DIRECTORY_ADDRESS_SELECT },
} as const

export function serializeBankBranch(row: BankBranchRow): BankBranch {
  return {
    object: 'bank_branch',
    id: row.id,
    bank_id: row.bankId,
    name: row.name,
    transit_number: row.transitNumber,
    routing_number: row.routingNumber,
    address_id: row.addressId,
    contact_number: row.contactNumber,
    operating_hours: row.operatingHours,
    address: serializeDirectoryAddress(row.directoryAddress),
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}

export type BankAccountRow = {
  id: string
  accountHolder: string
  bankId: string
  branchId: string | null
  accountNumber: string
  accountType: string
  currency: string
  createdAt: bigint
  updatedAt: bigint
}

export const BANK_ACCOUNT_SELECT = {
  id: true,
  accountHolder: true,
  bankId: true,
  branchId: true,
  accountNumber: true,
  accountType: true,
  currency: true,
  createdAt: true,
  updatedAt: true,
} as const

export function serializeBankAccount(row: BankAccountRow): BankAccount {
  return {
    object: 'bank_account',
    id: row.id,
    account_holder: row.accountHolder,
    bank_id: row.bankId,
    branch_id: row.branchId,
    account_number: row.accountNumber,
    account_type: row.accountType,
    currency: row.currency,
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}

export type CreditUnionRow = {
  id: string
  name: string
  shortName: string | null
  logoUrl: string | null
  headquarters: string | null
  createdAt: bigint
  updatedAt: bigint
}

export const CREDIT_UNION_SELECT = {
  id: true,
  name: true,
  shortName: true,
  logoUrl: true,
  headquarters: true,
  createdAt: true,
  updatedAt: true,
} as const

export function serializeCreditUnion(row: CreditUnionRow): CreditUnion {
  return {
    object: 'credit_union',
    id: row.id,
    name: row.name,
    short_name: row.shortName,
    logo_url: row.logoUrl,
    headquarters: row.headquarters,
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}

export type CreditUnionBranchRow = {
  id: string
  creditUnionId: string
  name: string
  addressId: string
  contactNumber: string | null
  email: string | null
  createdAt: bigint
  updatedAt: bigint
  directoryAddress: DirectoryAddressRow
}

export const CREDIT_UNION_BRANCH_SELECT = {
  id: true,
  creditUnionId: true,
  name: true,
  addressId: true,
  contactNumber: true,
  email: true,
  createdAt: true,
  updatedAt: true,
  directoryAddress: { select: DIRECTORY_ADDRESS_SELECT },
} as const

export function serializeCreditUnionBranch(
  row: CreditUnionBranchRow
): CreditUnionBranch {
  return {
    object: 'credit_union_branch',
    id: row.id,
    credit_union_id: row.creditUnionId,
    name: row.name,
    address_id: row.addressId,
    contact_number: row.contactNumber,
    email: row.email,
    address: serializeDirectoryAddress(row.directoryAddress),
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}
