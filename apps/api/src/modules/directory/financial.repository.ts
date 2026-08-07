/**
 * Every query against the financial directory tables.
 *
 * Ported from the financial half of `db/repositories/directory.py`. Reads accept
 * an `includeDeleted` flag because these tables carry tombstone columns; the
 * *decision* to honour it is the service's, since it depends on the caller's
 * privilege (`.claude/rules/deletions.md`).
 *
 * A branch owns its address: the two rows are written together through Prisma's
 * nested write, so a failure cannot leave an orphan address behind — the Python
 * relied on the surrounding session flush for the same guarantee.
 */

import { prisma } from '@/db/client'
import { paginateByCursor, type PaginationQuery } from '@/http/envelope'
import { deletionValues, shouldSoftDelete } from '@/platform/deletion'
import { generateId } from '@/platform/ids'
import { nowUnixSeconds } from '@/platform/timestamps'

import {
  addressCreateData,
  addressUpdateData,
  liveOnly,
  nameSearch,
} from './directory.repository'
import type {
  DirectoryAddressCreate,
  DirectoryAddressUpdate,
} from './directory.schemas'
import {
  BANK_ACCOUNT_SELECT,
  BANK_BRANCH_SELECT,
  BANK_SELECT,
  CREDIT_UNION_BRANCH_SELECT,
  CREDIT_UNION_SELECT,
  type BankAccountRow,
  type BankBranchRow,
  type BankRow,
  type CreditUnionBranchRow,
  type CreditUnionRow,
} from './financial.serializers'

// --- Banks ---

export async function findBankById(
  bankId: string,
  includeDeleted = false
): Promise<BankRow | null> {
  const row = await prisma.bank.findFirst({
    where: { id: bankId, ...liveOnly(includeDeleted) },
    select: BANK_SELECT,
  })

  return row
}

export function findBankByCode(
  bankCode: string,
  includeDeleted = false
): Promise<BankRow | null> {
  return prisma.bank.findFirst({
    where: { bankCode, ...liveOnly(includeDeleted) },
    select: BANK_SELECT,
  })
}

export function listBanks(
  query: PaginationQuery,
  options: { includeDeleted: boolean; search?: string | undefined }
): Promise<{ data: BankRow[]; hasMore: boolean }> {
  const where = {
    ...liveOnly(options.includeDeleted),
    ...nameSearch(options.search),
  }

  return paginateByCursor<BankRow>({
    query,
    loadAnchor: (id) => findBankById(id, options.includeDeleted),
    cursorOf: (row) => row.createdAt,
    fetch: ({ take, cursor, order }) =>
      prisma.bank.findMany({
        where: cursor
          ? {
              AND: [where, { createdAt: { [cursor.direction]: cursor.value } }],
            }
          : where,
        orderBy: { createdAt: order },
        take,
        select: BANK_SELECT,
      }),
  })
}

export function createBank(data: {
  name: string
  shortName: string | null
  bankCode: string
  swiftCode: string | null
  logoUrl: string | null
  headOffice: string | null
  website: string | null
}): Promise<BankRow> {
  const now = BigInt(nowUnixSeconds())

  return prisma.bank.create({
    data: { id: generateId('bank'), ...data, createdAt: now, updatedAt: now },
    select: BANK_SELECT,
  })
}

/** Returns null when the row is gone, so the caller can answer 404. */
export async function updateBank(
  bankId: string,
  data: Record<string, unknown>
): Promise<BankRow | null> {
  const exists = await prisma.bank.findUnique({
    where: { id: bankId },
    select: { id: true },
  })
  if (!exists) return null

  return prisma.bank.update({
    where: { id: bankId },
    data: { ...data, updatedAt: BigInt(nowUnixSeconds()) },
    select: BANK_SELECT,
  })
}

export async function deleteBank(
  bankId: string,
  deletedBy: string | null = null,
  reason: string | null = null
): Promise<boolean> {
  if (shouldSoftDelete()) {
    const result = await prisma.bank.updateMany({
      where: { id: bankId, deletedAt: null },
      data: deletionValues(deletedBy, reason),
    })
    return result.count > 0
  }

  const result = await prisma.bank.deleteMany({ where: { id: bankId } })
  return result.count > 0
}

// --- Bank branches ---

export function findBankBranchById(
  branchId: string,
  includeDeleted = false
): Promise<BankBranchRow | null> {
  return prisma.bankBranch.findFirst({
    where: { id: branchId, ...liveOnly(includeDeleted) },
    select: BANK_BRANCH_SELECT,
  })
}

export function findBankBranchByTransit(
  bankId: string,
  transitNumber: string,
  includeDeleted = false
): Promise<BankBranchRow | null> {
  return prisma.bankBranch.findFirst({
    where: { bankId, transitNumber, ...liveOnly(includeDeleted) },
    select: BANK_BRANCH_SELECT,
  })
}

export function listBankBranches(
  bankId: string,
  query: PaginationQuery,
  options: { includeDeleted: boolean; search?: string | undefined }
): Promise<{ data: BankBranchRow[]; hasMore: boolean }> {
  const where = {
    bankId,
    ...liveOnly(options.includeDeleted),
    ...nameSearch(options.search),
  }

  return paginateByCursor<BankBranchRow>({
    query,
    loadAnchor: (id) => findBankBranchById(id, options.includeDeleted),
    cursorOf: (row) => row.createdAt,
    fetch: ({ take, cursor, order }) =>
      prisma.bankBranch.findMany({
        where: cursor
          ? {
              AND: [where, { createdAt: { [cursor.direction]: cursor.value } }],
            }
          : where,
        orderBy: { createdAt: order },
        take,
        select: BANK_BRANCH_SELECT,
      }),
  })
}

export function createBankBranch(
  bankId: string,
  data: {
    name: string
    transitNumber: string
    routingNumber: string | null
    contactNumber: string | null
    operatingHours: string | null
    address: DirectoryAddressCreate
  }
): Promise<BankBranchRow> {
  const now = BigInt(nowUnixSeconds())

  return prisma.bankBranch.create({
    data: {
      id: generateId('bankBranch'),
      // `connect` rather than a bare `bankId`: setting the scalar selects
      // Prisma's unchecked create input, which forbids the nested address write
      // — and writing the address separately is what risks an orphan row.
      bank: { connect: { id: bankId } },
      name: data.name,
      transitNumber: data.transitNumber,
      routingNumber: data.routingNumber,
      contactNumber: data.contactNumber,
      operatingHours: data.operatingHours,
      createdAt: now,
      updatedAt: now,
      directoryAddress: { create: addressCreateData(data.address, now) },
    },
    select: BANK_BRANCH_SELECT,
  })
}

export async function updateBankBranch(
  branchId: string,
  data: Record<string, unknown>,
  address?: DirectoryAddressUpdate | null
): Promise<BankBranchRow | null> {
  const exists = await prisma.bankBranch.findUnique({
    where: { id: branchId },
    select: { id: true },
  })
  if (!exists) return null

  const now = BigInt(nowUnixSeconds())

  return prisma.bankBranch.update({
    where: { id: branchId },
    data: {
      ...data,
      updatedAt: now,
      ...(address
        ? { directoryAddress: { update: addressUpdateData(address, now) } }
        : {}),
    },
    select: BANK_BRANCH_SELECT,
  })
}

export async function deleteBankBranch(
  branchId: string,
  deletedBy: string | null = null,
  reason: string | null = null
): Promise<boolean> {
  if (shouldSoftDelete()) {
    const result = await prisma.bankBranch.updateMany({
      where: { id: branchId, deletedAt: null },
      data: deletionValues(deletedBy, reason),
    })
    return result.count > 0
  }

  const result = await prisma.bankBranch.deleteMany({ where: { id: branchId } })
  return result.count > 0
}

// --- Bank accounts ---

export function findBankAccountById(
  accountId: string,
  includeDeleted = false
): Promise<BankAccountRow | null> {
  return prisma.bankAccount.findFirst({
    where: { id: accountId, ...liveOnly(includeDeleted) },
    select: BANK_ACCOUNT_SELECT,
  })
}

export function listBankAccounts(
  query: PaginationQuery,
  options: { includeDeleted: boolean; search?: string | undefined }
): Promise<{ data: BankAccountRow[]; hasMore: boolean }> {
  const where = {
    ...liveOnly(options.includeDeleted),
    ...(options.search
      ? {
          accountHolder: {
            contains: options.search,
            mode: 'insensitive' as const,
          },
        }
      : {}),
  }

  return paginateByCursor<BankAccountRow>({
    query,
    loadAnchor: (id) => findBankAccountById(id, options.includeDeleted),
    cursorOf: (row) => row.createdAt,
    fetch: ({ take, cursor, order }) =>
      prisma.bankAccount.findMany({
        where: cursor
          ? {
              AND: [where, { createdAt: { [cursor.direction]: cursor.value } }],
            }
          : where,
        orderBy: { createdAt: order },
        take,
        select: BANK_ACCOUNT_SELECT,
      }),
  })
}

export function createBankAccount(data: {
  accountHolder: string
  bankId: string
  branchId: string | null
  accountNumber: string
  accountType: string
  currency: string
}): Promise<BankAccountRow> {
  const now = BigInt(nowUnixSeconds())

  return prisma.bankAccount.create({
    data: {
      id: generateId('bankAccount'),
      ...data,
      createdAt: now,
      updatedAt: now,
    },
    select: BANK_ACCOUNT_SELECT,
  })
}

export async function updateBankAccount(
  accountId: string,
  data: Record<string, unknown>
): Promise<BankAccountRow | null> {
  const exists = await prisma.bankAccount.findUnique({
    where: { id: accountId },
    select: { id: true },
  })
  if (!exists) return null

  return prisma.bankAccount.update({
    where: { id: accountId },
    data: { ...data, updatedAt: BigInt(nowUnixSeconds()) },
    select: BANK_ACCOUNT_SELECT,
  })
}

export async function deleteBankAccount(
  accountId: string,
  deletedBy: string | null = null,
  reason: string | null = null
): Promise<boolean> {
  if (shouldSoftDelete()) {
    const result = await prisma.bankAccount.updateMany({
      where: { id: accountId, deletedAt: null },
      data: deletionValues(deletedBy, reason),
    })
    return result.count > 0
  }

  const result = await prisma.bankAccount.deleteMany({
    where: { id: accountId },
  })
  return result.count > 0
}

// --- Credit unions ---

export function findCreditUnionById(
  creditUnionId: string,
  includeDeleted = false
): Promise<CreditUnionRow | null> {
  return prisma.creditUnion.findFirst({
    where: { id: creditUnionId, ...liveOnly(includeDeleted) },
    select: CREDIT_UNION_SELECT,
  })
}

export function listCreditUnions(
  query: PaginationQuery,
  options: { includeDeleted: boolean; search?: string | undefined }
): Promise<{ data: CreditUnionRow[]; hasMore: boolean }> {
  const where = {
    ...liveOnly(options.includeDeleted),
    ...nameSearch(options.search),
  }

  return paginateByCursor<CreditUnionRow>({
    query,
    loadAnchor: (id) => findCreditUnionById(id, options.includeDeleted),
    cursorOf: (row) => row.createdAt,
    fetch: ({ take, cursor, order }) =>
      prisma.creditUnion.findMany({
        where: cursor
          ? {
              AND: [where, { createdAt: { [cursor.direction]: cursor.value } }],
            }
          : where,
        orderBy: { createdAt: order },
        take,
        select: CREDIT_UNION_SELECT,
      }),
  })
}

export function createCreditUnion(data: {
  name: string
  shortName: string | null
  logoUrl: string | null
  headquarters: string | null
}): Promise<CreditUnionRow> {
  const now = BigInt(nowUnixSeconds())

  return prisma.creditUnion.create({
    data: {
      id: generateId('creditUnion'),
      ...data,
      createdAt: now,
      updatedAt: now,
    },
    select: CREDIT_UNION_SELECT,
  })
}

export async function updateCreditUnion(
  creditUnionId: string,
  data: Record<string, unknown>
): Promise<CreditUnionRow | null> {
  const exists = await prisma.creditUnion.findUnique({
    where: { id: creditUnionId },
    select: { id: true },
  })
  if (!exists) return null

  return prisma.creditUnion.update({
    where: { id: creditUnionId },
    data: { ...data, updatedAt: BigInt(nowUnixSeconds()) },
    select: CREDIT_UNION_SELECT,
  })
}

export async function deleteCreditUnion(
  creditUnionId: string,
  deletedBy: string | null = null,
  reason: string | null = null
): Promise<boolean> {
  if (shouldSoftDelete()) {
    const result = await prisma.creditUnion.updateMany({
      where: { id: creditUnionId, deletedAt: null },
      data: deletionValues(deletedBy, reason),
    })
    return result.count > 0
  }

  const result = await prisma.creditUnion.deleteMany({
    where: { id: creditUnionId },
  })
  return result.count > 0
}

// --- Credit union branches ---

export function findCreditUnionBranchById(
  branchId: string,
  includeDeleted = false
): Promise<CreditUnionBranchRow | null> {
  return prisma.creditUnionBranch.findFirst({
    where: { id: branchId, ...liveOnly(includeDeleted) },
    select: CREDIT_UNION_BRANCH_SELECT,
  })
}

export function listCreditUnionBranches(
  creditUnionId: string,
  query: PaginationQuery,
  options: { includeDeleted: boolean; search?: string | undefined }
): Promise<{ data: CreditUnionBranchRow[]; hasMore: boolean }> {
  const where = {
    creditUnionId,
    ...liveOnly(options.includeDeleted),
    ...nameSearch(options.search),
  }

  return paginateByCursor<CreditUnionBranchRow>({
    query,
    loadAnchor: (id) => findCreditUnionBranchById(id, options.includeDeleted),
    cursorOf: (row) => row.createdAt,
    fetch: ({ take, cursor, order }) =>
      prisma.creditUnionBranch.findMany({
        where: cursor
          ? {
              AND: [where, { createdAt: { [cursor.direction]: cursor.value } }],
            }
          : where,
        orderBy: { createdAt: order },
        take,
        select: CREDIT_UNION_BRANCH_SELECT,
      }),
  })
}

export function createCreditUnionBranch(
  creditUnionId: string,
  data: {
    name: string
    contactNumber: string | null
    email: string | null
    address: DirectoryAddressCreate
  }
): Promise<CreditUnionBranchRow> {
  const now = BigInt(nowUnixSeconds())

  return prisma.creditUnionBranch.create({
    data: {
      id: generateId('creditUnionBranch'),
      creditUnion: { connect: { id: creditUnionId } },
      name: data.name,
      contactNumber: data.contactNumber,
      email: data.email,
      createdAt: now,
      updatedAt: now,
      directoryAddress: { create: addressCreateData(data.address, now) },
    },
    select: CREDIT_UNION_BRANCH_SELECT,
  })
}

export async function updateCreditUnionBranch(
  branchId: string,
  data: Record<string, unknown>,
  address?: DirectoryAddressUpdate | null
): Promise<CreditUnionBranchRow | null> {
  const exists = await prisma.creditUnionBranch.findUnique({
    where: { id: branchId },
    select: { id: true },
  })
  if (!exists) return null

  const now = BigInt(nowUnixSeconds())

  return prisma.creditUnionBranch.update({
    where: { id: branchId },
    data: {
      ...data,
      updatedAt: now,
      ...(address
        ? { directoryAddress: { update: addressUpdateData(address, now) } }
        : {}),
    },
    select: CREDIT_UNION_BRANCH_SELECT,
  })
}

export async function deleteCreditUnionBranch(
  branchId: string,
  deletedBy: string | null = null,
  reason: string | null = null
): Promise<boolean> {
  if (shouldSoftDelete()) {
    const result = await prisma.creditUnionBranch.updateMany({
      where: { id: branchId, deletedAt: null },
      data: deletionValues(deletedBy, reason),
    })
    return result.count > 0
  }

  const result = await prisma.creditUnionBranch.deleteMany({
    where: { id: branchId },
  })
  return result.count > 0
}
