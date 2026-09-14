/**
 * Row → API resource for the financial directory.
 *
 * Every timestamp column is Prisma `BigInt`; one reaching `JSON.stringify`
 * throws at runtime, so each goes through `fromDbUnixSeconds`.
 */

import {
  fromDbUnixSeconds,
  nullableFromDbUnixSeconds,
} from '@/platform/timestamps'

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
  countryCode: string
  name: string
  shortName: string | null
  bankCode: string
  clearingSystem: string | null
  institutionType: string
  swiftCode: string | null
  logoUrl: string | null
  headOffice: string | null
  website: string | null
  generalPhone: string | null
  supportPhone: string | null
  supportEmail: string | null
  complaintsEmail: string | null
  contactUrl: string | null
  sourceUrl: string | null
  sourceAsOf: string | null
  lastVerifiedAt: bigint | null
  createdAt: bigint
  updatedAt: bigint
}

export const BANK_SELECT = {
  id: true,
  countryCode: true,
  name: true,
  shortName: true,
  bankCode: true,
  clearingSystem: true,
  institutionType: true,
  swiftCode: true,
  logoUrl: true,
  headOffice: true,
  website: true,
  generalPhone: true,
  supportPhone: true,
  supportEmail: true,
  complaintsEmail: true,
  contactUrl: true,
  sourceUrl: true,
  sourceAsOf: true,
  lastVerifiedAt: true,
  createdAt: true,
  updatedAt: true,
} as const

export function serializeBank(row: BankRow): Bank {
  return {
    object: 'bank',
    id: row.id,
    country_code: row.countryCode,
    name: row.name,
    short_name: row.shortName,
    bank_code: row.bankCode,
    clearing_system: row.clearingSystem,
    institution_type: row.institutionType,
    swift_code: row.swiftCode,
    logo_url: row.logoUrl,
    head_office: row.headOffice,
    website: row.website,
    general_phone: row.generalPhone,
    support_phone: row.supportPhone,
    support_email: row.supportEmail,
    complaints_email: row.complaintsEmail,
    contact_url: row.contactUrl,
    source_url: row.sourceUrl,
    source_as_of: row.sourceAsOf,
    last_verified_at: nullableFromDbUnixSeconds(row.lastVerifiedAt),
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
  rawAddress: string | null
  addressId: string | null
  contactNumber: string | null
  operatingHours: string | null
  branchType: string | null
  status: string | null
  sourceUrl: string | null
  sourceAsOf: string | null
  lastVerifiedAt: bigint | null
  createdAt: bigint
  updatedAt: bigint
  directoryAddress: DirectoryAddressRow | null
}

export const BANK_BRANCH_SELECT = {
  id: true,
  bankId: true,
  name: true,
  transitNumber: true,
  routingNumber: true,
  rawAddress: true,
  addressId: true,
  contactNumber: true,
  operatingHours: true,
  branchType: true,
  status: true,
  sourceUrl: true,
  sourceAsOf: true,
  lastVerifiedAt: true,
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
    raw_address: row.rawAddress,
    address_id: row.addressId,
    contact_number: row.contactNumber,
    operating_hours: row.operatingHours,
    branch_type: row.branchType as BankBranch['branch_type'],
    status: row.status as BankBranch['status'],
    source_url: row.sourceUrl,
    source_as_of: row.sourceAsOf,
    last_verified_at: nullableFromDbUnixSeconds(row.lastVerifiedAt),
    address: row.directoryAddress
      ? serializeDirectoryAddress(row.directoryAddress)
      : null,
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
  code: string | null
  name: string
  shortName: string | null
  logoUrl: string | null
  headquarters: string | null
  website: string | null
  generalPhone: string | null
  supportPhone: string | null
  supportEmail: string | null
  complaintsEmail: string | null
  contactUrl: string | null
  sourceUrl: string | null
  sourceAsOf: string | null
  lastVerifiedAt: bigint | null
  createdAt: bigint
  updatedAt: bigint
}

export const CREDIT_UNION_SELECT = {
  id: true,
  code: true,
  name: true,
  shortName: true,
  logoUrl: true,
  headquarters: true,
  website: true,
  generalPhone: true,
  supportPhone: true,
  supportEmail: true,
  complaintsEmail: true,
  contactUrl: true,
  sourceUrl: true,
  sourceAsOf: true,
  lastVerifiedAt: true,
  createdAt: true,
  updatedAt: true,
} as const

export function serializeCreditUnion(row: CreditUnionRow): CreditUnion {
  return {
    object: 'credit_union',
    id: row.id,
    code: row.code,
    name: row.name,
    short_name: row.shortName,
    logo_url: row.logoUrl,
    headquarters: row.headquarters,
    website: row.website,
    general_phone: row.generalPhone,
    support_phone: row.supportPhone,
    support_email: row.supportEmail,
    complaints_email: row.complaintsEmail,
    contact_url: row.contactUrl,
    source_url: row.sourceUrl,
    source_as_of: row.sourceAsOf,
    last_verified_at: nullableFromDbUnixSeconds(row.lastVerifiedAt),
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}

export type CreditUnionBranchRow = {
  id: string
  code: string | null
  creditUnionId: string
  name: string
  rawAddress: string | null
  addressId: string | null
  contactNumber: string | null
  email: string | null
  operatingHours: string | null
  branchType: string | null
  status: string | null
  sourceUrl: string | null
  sourceAsOf: string | null
  lastVerifiedAt: bigint | null
  createdAt: bigint
  updatedAt: bigint
  directoryAddress: DirectoryAddressRow | null
}

export const CREDIT_UNION_BRANCH_SELECT = {
  id: true,
  code: true,
  creditUnionId: true,
  name: true,
  rawAddress: true,
  addressId: true,
  contactNumber: true,
  email: true,
  operatingHours: true,
  branchType: true,
  status: true,
  sourceUrl: true,
  sourceAsOf: true,
  lastVerifiedAt: true,
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
    code: row.code,
    credit_union_id: row.creditUnionId,
    name: row.name,
    raw_address: row.rawAddress,
    address_id: row.addressId,
    contact_number: row.contactNumber,
    email: row.email,
    operating_hours: row.operatingHours,
    branch_type: row.branchType as CreditUnionBranch['branch_type'],
    status: row.status as CreditUnionBranch['status'],
    source_url: row.sourceUrl,
    source_as_of: row.sourceAsOf,
    last_verified_at: nullableFromDbUnixSeconds(row.lastVerifiedAt),
    address: row.directoryAddress
      ? serializeDirectoryAddress(row.directoryAddress)
      : null,
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}
