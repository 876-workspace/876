/**
 * Financial directory business rules.
 *
 * `include_deleted` is a privilege, not a preference. Duplicate institution
 * codes are checked including tombstones because country-scoped uniqueness is
 * enforced by the database. A branch selected for an account must belong to
 * the selected bank.
 */

import { listObject, type ListObject } from '@/http/envelope'
import { AppHttpError } from '@/http/errors'
import { nullableToDbUnixSeconds } from '@/platform/timestamps'

import {
  noFieldsToUpdate,
  notFound,
  resolveIncludeDeleted,
  sentFields,
} from './directory.service'
import { renameKeys } from './directory.repository'

import type {
  ListDirectoryQuery,
  RetrieveDirectoryQuery,
} from './directory.schemas'
import * as repository from './financial.repository'
import type {
  Bank,
  BankAccount,
  BankAccountCreate,
  BankAccountUpdate,
  BankBranch,
  BankBranchBatchQuery,
  BankBranchCreate,
  BankBranchListQuery,
  BankBranchUpdate,
  BankCreate,
  BankListQuery,
  BankUpdate,
  CreditUnion,
  CreditUnionBranch,
  CreditUnionBranchCreate,
  CreditUnionBranchUpdate,
  CreditUnionCreate,
  CreditUnionUpdate,
} from './financial.schemas'
import {
  serializeBank,
  serializeBankAccount,
  serializeBankBranch,
  serializeCreditUnion,
  serializeCreditUnionBranch,
} from './financial.serializers'

function duplicate(object: string, message: string): AppHttpError {
  return new AppHttpError({
    code: `${object}/duplicate-code`,
    message,
    httpStatus: 409,
  })
}

function invalidBankAccountReference(message: string): AppHttpError {
  return new AppHttpError({
    code: 'bank_account/invalid-reference',
    message,
    httpStatus: 422,
  })
}

async function requireCountry(countryCode: string): Promise<void> {
  if (!(await repository.countryExists(countryCode)))
    throw notFound('country', 'No country exists with the provided code.')
}

// --- Banks ---

export async function listBanks(
  query: BankListQuery,
  isInternal: boolean
): Promise<ListObject<Bank>> {
  const { data, hasMore } = await repository.listBanks(query, {
    includeDeleted: resolveIncludeDeleted(query.include_deleted, isInternal),
    search: query.search,
    countryCode: query.country_code,
    ids: query.ids,
  })

  return listObject({
    data: data.map(serializeBank),
    hasMore,
    url: '/directory/banks',
  })
}

export async function retrieveBank(
  bankId: string,
  query: RetrieveDirectoryQuery,
  isInternal: boolean
): Promise<Bank> {
  const row = await repository.findBankById(
    bankId,
    resolveIncludeDeleted(query.include_deleted, isInternal)
  )
  if (!row)
    throw notFound('bank', 'No bank exists with the provided identifier.')

  return serializeBank(row)
}

export async function createBank(body: BankCreate): Promise<Bank> {
  await requireCountry(body.country_code)

  const existing = await repository.findBankByCode(
    body.country_code,
    body.bank_code,
    true
  )
  if (existing)
    throw duplicate(
      'bank',
      'A bank with this code already exists in the selected country.'
    )

  const row = await repository.createBank({
    countryCode: body.country_code,
    name: body.name,
    shortName: body.short_name ?? null,
    bankCode: body.bank_code,
    clearingSystem: body.clearing_system ?? null,
    institutionType: body.institution_type,
    swiftCode: body.swift_code ?? null,
    logoUrl: body.logo_url ?? null,
    headOffice: body.head_office ?? null,
    website: body.website ?? null,
    generalPhone: body.general_phone ?? null,
    supportPhone: body.support_phone ?? null,
    supportEmail: body.support_email ?? null,
    complaintsEmail: body.complaints_email ?? null,
    contactUrl: body.contact_url ?? null,
    sourceUrl: body.source_url ?? null,
    sourceAsOf: body.source_as_of ?? null,
    lastVerifiedAt: nullableToDbUnixSeconds(body.last_verified_at),
  })

  return serializeBank(row)
}

export async function updateBank(
  bankId: string,
  body: BankUpdate
): Promise<Bank> {
  const data = sentFields(body)
  if (Object.keys(data).length === 0) throw noFieldsToUpdate()

  const current = await repository.findBankById(bankId, true)
  if (!current)
    throw notFound('bank', 'No bank exists with the provided identifier.')

  const countryCode = body.country_code ?? current.countryCode
  const bankCode = body.bank_code ?? current.bankCode
  if (body.country_code != null) await requireCountry(countryCode)

  if (body.country_code != null || body.bank_code != null) {
    const existing = await repository.findBankByCode(
      countryCode,
      bankCode,
      true
    )
    if (existing && existing.id !== bankId)
      throw duplicate(
        'bank',
        'A bank with this code already exists in the selected country.'
      )
  }

  const row = await repository.updateBank(bankId, renameBankFields(data))
  if (!row)
    throw notFound('bank', 'No bank exists with the provided identifier.')

  return serializeBank(row)
}

/**
 * The wire sends `last_verified_at` as a JSON number of Unix seconds; Prisma's
 * BIGINT column takes a bigint. Every resource that can carry the field goes
 * through here so none of them writes a number into a bigint column.
 */
function toDbTimestamp(data: Record<string, unknown>): Record<string, unknown> {
  if (!Object.prototype.hasOwnProperty.call(data, 'lastVerifiedAt')) return data

  return {
    ...data,
    lastVerifiedAt: nullableToDbUnixSeconds(
      data['lastVerifiedAt'] as number | null | undefined
    ),
  }
}

function renameBankFields(
  data: Record<string, unknown>
): Record<string, unknown> {
  const map: Record<string, string> = {
    country_code: 'countryCode',
    short_name: 'shortName',
    bank_code: 'bankCode',
    clearing_system: 'clearingSystem',
    institution_type: 'institutionType',
    swift_code: 'swiftCode',
    logo_url: 'logoUrl',
    head_office: 'headOffice',
    general_phone: 'generalPhone',
    support_phone: 'supportPhone',
    support_email: 'supportEmail',
    complaints_email: 'complaintsEmail',
    contact_url: 'contactUrl',
    source_url: 'sourceUrl',
    source_as_of: 'sourceAsOf',
    last_verified_at: 'lastVerifiedAt',
  }

  return toDbTimestamp(renameKeys(data, map))
}

export async function deleteBank(
  bankId: string,
  deletedBy: string | null
): Promise<{ object: 'bank'; id: string; deleted: true }> {
  const deleted = await repository.deleteBank(bankId, deletedBy)
  if (!deleted)
    throw notFound('bank', 'No bank exists with the provided identifier.')

  return { object: 'bank', id: bankId, deleted: true }
}

// --- Bank branches ---

export async function listBankBranches(
  bankId: string,
  query: BankBranchListQuery,
  isInternal: boolean
): Promise<ListObject<BankBranch>> {
  const includeDeleted = resolveIncludeDeleted(
    query.include_deleted,
    isInternal
  )

  const bank = await repository.findBankById(bankId, includeDeleted)
  if (!bank)
    throw notFound('bank', 'No bank exists with the provided identifier.')

  const { data, hasMore } = await repository.listBankBranches(bankId, query, {
    includeDeleted,
    search: query.search,
    ids: query.ids,
  })

  return listObject({
    data: data.map(serializeBankBranch),
    hasMore,
    url: `/directory/banks/${bankId}/branches`,
  })
}

export async function listBankBranchesGlobal(
  query: BankBranchBatchQuery,
  isInternal: boolean
): Promise<ListObject<BankBranch>> {
  const { data, hasMore } = await repository.listBankBranchesGlobal(query, {
    includeDeleted: resolveIncludeDeleted(query.include_deleted, isInternal),
    search: query.search,
    bankId: query.bank_id,
    ids: query.ids,
  })

  return listObject({
    data: data.map(serializeBankBranch),
    hasMore,
    url: '/directory/bank-branches',
  })
}

export async function retrieveBankBranch(
  branchId: string,
  query: RetrieveDirectoryQuery,
  isInternal: boolean
): Promise<BankBranch> {
  const row = await repository.findBankBranchById(
    branchId,
    resolveIncludeDeleted(query.include_deleted, isInternal)
  )
  if (!row)
    throw notFound(
      'bank_branch',
      'No bank branch exists with the provided identifier.'
    )

  return serializeBankBranch(row)
}

export async function createBankBranch(
  bankId: string,
  body: BankBranchCreate
): Promise<BankBranch> {
  const bank = await repository.findBankById(bankId)
  if (!bank)
    throw notFound('bank', 'No bank exists with the provided identifier.')

  const existing = await repository.findBankBranchByTransit(
    bankId,
    body.transit_number,
    true
  )
  if (existing)
    throw new AppHttpError({
      code: 'bank_branch/duplicate-transit-number',
      message:
        'A branch with this transit number already exists for this bank.',
      httpStatus: 409,
    })

  const row = await repository.createBankBranch(bankId, {
    name: body.name,
    transitNumber: body.transit_number,
    routingNumber: body.routing_number ?? null,
    rawAddress: body.raw_address ?? null,
    contactNumber: body.contact_number ?? null,
    operatingHours: body.operating_hours ?? null,
    branchType: body.branch_type ?? null,
    status: body.status ?? null,
    sourceUrl: body.source_url ?? null,
    sourceAsOf: body.source_as_of ?? null,
    lastVerifiedAt: nullableToDbUnixSeconds(body.last_verified_at),
    address: body.address,
  })

  return serializeBankBranch(row)
}

export async function updateBankBranch(
  branchId: string,
  body: BankBranchUpdate
): Promise<BankBranch> {
  const data = sentFields(body, ['address'])
  if (Object.keys(data).length === 0 && body.address == null)
    throw noFieldsToUpdate()

  const row = await repository.updateBankBranch(
    branchId,
    renameBranchFields(data),
    body.address
  )
  if (!row)
    throw notFound(
      'bank_branch',
      'No bank branch exists with the provided identifier.'
    )

  return serializeBankBranch(row)
}

function renameBranchFields(
  data: Record<string, unknown>
): Record<string, unknown> {
  const map: Record<string, string> = {
    transit_number: 'transitNumber',
    routing_number: 'routingNumber',
    raw_address: 'rawAddress',
    contact_number: 'contactNumber',
    operating_hours: 'operatingHours',
    branch_type: 'branchType',
    source_url: 'sourceUrl',
    source_as_of: 'sourceAsOf',
    last_verified_at: 'lastVerifiedAt',
  }

  return toDbTimestamp(renameKeys(data, map))
}

export async function deleteBankBranch(
  branchId: string,
  deletedBy: string | null
): Promise<{ object: 'bank_branch'; id: string; deleted: true }> {
  const deleted = await repository.deleteBankBranch(branchId, deletedBy)
  if (!deleted)
    throw notFound(
      'bank_branch',
      'No bank branch exists with the provided identifier.'
    )

  return { object: 'bank_branch', id: branchId, deleted: true }
}

// --- Bank accounts ---

export async function listBankAccounts(
  query: ListDirectoryQuery,
  isInternal: boolean
): Promise<ListObject<BankAccount>> {
  const { data, hasMore } = await repository.listBankAccounts(query, {
    includeDeleted: resolveIncludeDeleted(query.include_deleted, isInternal),
    search: query.search,
  })

  return listObject({
    data: data.map(serializeBankAccount),
    hasMore,
    url: '/directory/bank-accounts',
  })
}

export async function retrieveBankAccount(
  accountId: string,
  query: RetrieveDirectoryQuery,
  isInternal: boolean
): Promise<BankAccount> {
  const row = await repository.findBankAccountById(
    accountId,
    resolveIncludeDeleted(query.include_deleted, isInternal)
  )
  if (!row)
    throw notFound(
      'bank_account',
      'No bank account exists with the provided identifier.'
    )

  return serializeBankAccount(row)
}

async function validateBankBranchPair(
  bankId: string,
  branchId: string | null
): Promise<void> {
  const bank = await repository.findBankById(bankId)
  if (!bank)
    throw notFound('bank', 'No bank exists with the provided identifier.')

  if (!branchId) return

  const branch = await repository.findBankBranchById(branchId)
  if (!branch)
    throw notFound(
      'bank_branch',
      'No bank branch exists with the provided identifier.'
    )
  if (branch.bankId !== bankId)
    throw invalidBankAccountReference(
      'The selected branch does not belong to the selected bank.'
    )
}

export async function createBankAccount(
  body: BankAccountCreate
): Promise<BankAccount> {
  await validateBankBranchPair(body.bank_id, body.branch_id ?? null)

  const row = await repository.createBankAccount({
    accountHolder: body.account_holder,
    bankId: body.bank_id,
    branchId: body.branch_id ?? null,
    accountNumber: body.account_number,
    accountType: body.account_type,
    currency: body.currency,
  })

  return serializeBankAccount(row)
}

export async function updateBankAccount(
  accountId: string,
  body: BankAccountUpdate
): Promise<BankAccount> {
  const data = sentFields(body)
  if (Object.keys(data).length === 0) throw noFieldsToUpdate()

  const current = await repository.findBankAccountById(accountId, true)
  if (!current)
    throw notFound(
      'bank_account',
      'No bank account exists with the provided identifier.'
    )

  const bankId = body.bank_id ?? current.bankId
  const branchId = Object.prototype.hasOwnProperty.call(body, 'branch_id')
    ? (body.branch_id ?? null)
    : current.branchId
  await validateBankBranchPair(bankId, branchId)

  const map: Record<string, string> = {
    account_holder: 'accountHolder',
    bank_id: 'bankId',
    branch_id: 'branchId',
    account_number: 'accountNumber',
    account_type: 'accountType',
  }
  const renamed = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [map[key] ?? key, value])
  )

  const row = await repository.updateBankAccount(accountId, renamed)
  if (!row)
    throw notFound(
      'bank_account',
      'No bank account exists with the provided identifier.'
    )

  return serializeBankAccount(row)
}

export async function deleteBankAccount(
  accountId: string,
  deletedBy: string | null
): Promise<{ object: 'bank_account'; id: string; deleted: true }> {
  const deleted = await repository.deleteBankAccount(accountId, deletedBy)
  if (!deleted)
    throw notFound(
      'bank_account',
      'No bank account exists with the provided identifier.'
    )

  return { object: 'bank_account', id: accountId, deleted: true }
}

// --- Credit unions ---

export async function listCreditUnions(
  query: ListDirectoryQuery,
  isInternal: boolean
): Promise<ListObject<CreditUnion>> {
  const { data, hasMore } = await repository.listCreditUnions(query, {
    includeDeleted: resolveIncludeDeleted(query.include_deleted, isInternal),
    search: query.search,
  })

  return listObject({
    data: data.map(serializeCreditUnion),
    hasMore,
    url: '/directory/credit-unions',
  })
}

export async function retrieveCreditUnion(
  creditUnionId: string,
  query: RetrieveDirectoryQuery,
  isInternal: boolean
): Promise<CreditUnion> {
  const row = await repository.findCreditUnionById(
    creditUnionId,
    resolveIncludeDeleted(query.include_deleted, isInternal)
  )
  if (!row)
    throw notFound(
      'credit_union',
      'No credit union exists with the provided identifier.'
    )

  return serializeCreditUnion(row)
}

export async function createCreditUnion(
  body: CreditUnionCreate
): Promise<CreditUnion> {
  const row = await repository.createCreditUnion({
    code: body.code ?? null,
    name: body.name,
    shortName: body.short_name ?? null,
    logoUrl: body.logo_url ?? null,
    headquarters: body.headquarters ?? null,
    website: body.website ?? null,
    generalPhone: body.general_phone ?? null,
    supportPhone: body.support_phone ?? null,
    supportEmail: body.support_email ?? null,
    complaintsEmail: body.complaints_email ?? null,
    contactUrl: body.contact_url ?? null,
    sourceUrl: body.source_url ?? null,
    sourceAsOf: body.source_as_of ?? null,
    lastVerifiedAt: nullableToDbUnixSeconds(body.last_verified_at),
  })

  return serializeCreditUnion(row)
}

export async function updateCreditUnion(
  creditUnionId: string,
  body: CreditUnionUpdate
): Promise<CreditUnion> {
  const data = sentFields(body)
  if (Object.keys(data).length === 0) throw noFieldsToUpdate()

  const map: Record<string, string> = {
    short_name: 'shortName',
    logo_url: 'logoUrl',
    general_phone: 'generalPhone',
    support_phone: 'supportPhone',
    support_email: 'supportEmail',
    complaints_email: 'complaintsEmail',
    contact_url: 'contactUrl',
    source_url: 'sourceUrl',
    source_as_of: 'sourceAsOf',
    last_verified_at: 'lastVerifiedAt',
  }
  const renamed = toDbTimestamp(renameKeys(data, map))

  const row = await repository.updateCreditUnion(creditUnionId, renamed)
  if (!row)
    throw notFound(
      'credit_union',
      'No credit union exists with the provided identifier.'
    )

  return serializeCreditUnion(row)
}

export async function deleteCreditUnion(
  creditUnionId: string,
  deletedBy: string | null
): Promise<{ object: 'credit_union'; id: string; deleted: true }> {
  const deleted = await repository.deleteCreditUnion(creditUnionId, deletedBy)
  if (!deleted)
    throw notFound(
      'credit_union',
      'No credit union exists with the provided identifier.'
    )

  return { object: 'credit_union', id: creditUnionId, deleted: true }
}

// --- Credit union branches ---

export async function listCreditUnionBranches(
  creditUnionId: string,
  query: ListDirectoryQuery,
  isInternal: boolean
): Promise<ListObject<CreditUnionBranch>> {
  const includeDeleted = resolveIncludeDeleted(
    query.include_deleted,
    isInternal
  )

  const creditUnion = await repository.findCreditUnionById(
    creditUnionId,
    includeDeleted
  )
  if (!creditUnion)
    throw notFound(
      'credit_union',
      'No credit union exists with the provided identifier.'
    )

  const { data, hasMore } = await repository.listCreditUnionBranches(
    creditUnionId,
    query,
    { includeDeleted, search: query.search }
  )

  return listObject({
    data: data.map(serializeCreditUnionBranch),
    hasMore,
    url: `/directory/credit-unions/${creditUnionId}/branches`,
  })
}

export async function retrieveCreditUnionBranch(
  branchId: string,
  query: RetrieveDirectoryQuery,
  isInternal: boolean
): Promise<CreditUnionBranch> {
  const row = await repository.findCreditUnionBranchById(
    branchId,
    resolveIncludeDeleted(query.include_deleted, isInternal)
  )
  if (!row)
    throw notFound(
      'credit_union_branch',
      'No credit union branch exists with the provided identifier.'
    )

  return serializeCreditUnionBranch(row)
}

export async function createCreditUnionBranch(
  creditUnionId: string,
  body: CreditUnionBranchCreate
): Promise<CreditUnionBranch> {
  const creditUnion = await repository.findCreditUnionById(creditUnionId)
  if (!creditUnion)
    throw notFound(
      'credit_union',
      'No credit union exists with the provided identifier.'
    )

  const row = await repository.createCreditUnionBranch(creditUnionId, {
    code: body.code ?? null,
    name: body.name,
    contactNumber: body.contact_number ?? null,
    email: body.email ?? null,
    operatingHours: body.operating_hours ?? null,
    branchType: body.branch_type ?? null,
    status: body.status ?? null,
    sourceUrl: body.source_url ?? null,
    sourceAsOf: body.source_as_of ?? null,
    lastVerifiedAt: nullableToDbUnixSeconds(body.last_verified_at),
    rawAddress: body.raw_address ?? null,
    address: body.address ?? null,
  })

  return serializeCreditUnionBranch(row)
}

export async function updateCreditUnionBranch(
  branchId: string,
  body: CreditUnionBranchUpdate
): Promise<CreditUnionBranch> {
  const data = sentFields(body, ['address'])
  if (Object.keys(data).length === 0 && body.address == null)
    throw noFieldsToUpdate()

  const map: Record<string, string> = {
    contact_number: 'contactNumber',
    raw_address: 'rawAddress',
    operating_hours: 'operatingHours',
    branch_type: 'branchType',
    source_url: 'sourceUrl',
    source_as_of: 'sourceAsOf',
    last_verified_at: 'lastVerifiedAt',
  }
  const renamed = toDbTimestamp(renameKeys(data, map))

  const row = await repository.updateCreditUnionBranch(
    branchId,
    renamed,
    body.address ?? null
  )
  if (!row)
    throw notFound(
      'credit_union_branch',
      'No credit union branch exists with the provided identifier.'
    )

  return serializeCreditUnionBranch(row)
}

export async function deleteCreditUnionBranch(
  branchId: string,
  deletedBy: string | null
): Promise<{ object: 'credit_union_branch'; id: string; deleted: true }> {
  const deleted = await repository.deleteCreditUnionBranch(branchId, deletedBy)
  if (!deleted)
    throw notFound(
      'credit_union_branch',
      'No credit union branch exists with the provided identifier.'
    )

  return { object: 'credit_union_branch', id: branchId, deleted: true }
}
