/**
 * Financial directory business rules.
 *
 * Two rules matter more than the CRUD around them:
 *
 * 1. **`include_deleted` is a privilege, not a preference.** The FastAPI routes
 *    compute `include_deleted if principal.internal else False`, so a caller
 *    holding only an app API key never sees a tombstoned row even when it asks.
 *    `resolveIncludeDeleted` is the single place that decision is made, and it
 *    silently forces `false` rather than raising — matching the Python, which
 *    answers the question it can answer instead of refusing.
 *
 * 2. **A duplicate code is a 409, and a soft-deleted row still holds its code.**
 *    The uniqueness check looks with `includeDeleted: true` deliberately: the
 *    database's unique index covers tombstoned rows too, so ignoring them would
 *    turn a clear 409 into a constraint violation surfacing as a 500.
 */

import { listObject, type ListObject } from '@/http/envelope'
import { AppHttpError } from '@/http/errors'

import {
  noFieldsToUpdate,
  notFound,
  resolveIncludeDeleted,
  sentFields,
} from './directory.service'

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
  BankBranchCreate,
  BankBranchUpdate,
  BankCreate,
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

// --- Banks ---

export async function listBanks(
  query: ListDirectoryQuery,
  isInternal: boolean
): Promise<ListObject<Bank>> {
  const { data, hasMore } = await repository.listBanks(query, {
    includeDeleted: resolveIncludeDeleted(query.include_deleted, isInternal),
    search: query.search,
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
  const existing = await repository.findBankByCode(body.bank_code, true)
  if (existing) throw duplicate('bank', 'A bank with this code already exists.')

  const row = await repository.createBank({
    name: body.name,
    shortName: body.short_name ?? null,
    bankCode: body.bank_code,
    swiftCode: body.swift_code ?? null,
    logoUrl: body.logo_url ?? null,
    headOffice: body.head_office ?? null,
    website: body.website ?? null,
  })

  return serializeBank(row)
}

export async function updateBank(
  bankId: string,
  body: BankUpdate
): Promise<Bank> {
  const data = sentFields(body)
  if (Object.keys(data).length === 0) throw noFieldsToUpdate()

  if (body.bank_code != null) {
    const existing = await repository.findBankByCode(body.bank_code, true)
    if (existing && existing.id !== bankId)
      throw duplicate('bank', 'A bank with this code already exists.')
  }

  const row = await repository.updateBank(bankId, renameBankFields(data))
  if (!row)
    throw notFound('bank', 'No bank exists with the provided identifier.')

  return serializeBank(row)
}

function renameBankFields(
  data: Record<string, unknown>
): Record<string, unknown> {
  const map: Record<string, string> = {
    short_name: 'shortName',
    bank_code: 'bankCode',
    swift_code: 'swiftCode',
    logo_url: 'logoUrl',
    head_office: 'headOffice',
  }

  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [map[key] ?? key, value])
  )
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
  query: ListDirectoryQuery,
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
  })

  return listObject({
    data: data.map(serializeBankBranch),
    hasMore,
    url: `/directory/banks/${bankId}/branches`,
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
    contactNumber: body.contact_number ?? null,
    operatingHours: body.operating_hours ?? null,
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
    contact_number: 'contactNumber',
    operating_hours: 'operatingHours',
  }

  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [map[key] ?? key, value])
  )
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

export async function createBankAccount(
  body: BankAccountCreate
): Promise<BankAccount> {
  const bank = await repository.findBankById(body.bank_id)
  if (!bank)
    throw notFound('bank', 'No bank exists with the provided identifier.')

  if (body.branch_id) {
    const branch = await repository.findBankBranchById(body.branch_id)
    if (!branch)
      throw notFound(
        'bank_branch',
        'No bank branch exists with the provided identifier.'
      )
  }

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
    name: body.name,
    shortName: body.short_name ?? null,
    logoUrl: body.logo_url ?? null,
    headquarters: body.headquarters ?? null,
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
  }
  const renamed = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [map[key] ?? key, value])
  )

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
    name: body.name,
    contactNumber: body.contact_number ?? null,
    email: body.email ?? null,
    address: body.address,
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

  const map: Record<string, string> = { contact_number: 'contactNumber' }
  const renamed = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [map[key] ?? key, value])
  )

  const row = await repository.updateCreditUnionBranch(
    branchId,
    renamed,
    body.address
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
