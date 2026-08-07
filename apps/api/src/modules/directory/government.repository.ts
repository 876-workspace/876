/** Every query against the government directory tables. */

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
  MINISTRY_DEPARTMENT_SELECT,
  MINISTRY_SELECT,
  type MinistryDepartmentRow,
  type MinistryRow,
} from './government.serializers'

// --- Ministries ---

export function findMinistryById(
  ministryId: string,
  includeDeleted = false
): Promise<MinistryRow | null> {
  return prisma.ministry.findFirst({
    where: { id: ministryId, ...liveOnly(includeDeleted) },
    select: MINISTRY_SELECT,
  })
}

export function listMinistries(
  query: PaginationQuery,
  options: { includeDeleted: boolean; search?: string | undefined }
): Promise<{ data: MinistryRow[]; hasMore: boolean }> {
  const where = {
    ...liveOnly(options.includeDeleted),
    ...nameSearch(options.search),
  }

  return paginateByCursor<MinistryRow>({
    query,
    loadAnchor: (id) => findMinistryById(id, options.includeDeleted),
    cursorOf: (row) => row.createdAt,
    fetch: ({ take, cursor, order }) =>
      prisma.ministry.findMany({
        where: cursor
          ? {
              AND: [where, { createdAt: { [cursor.direction]: cursor.value } }],
            }
          : where,
        orderBy: { createdAt: order },
        take,
        select: MINISTRY_SELECT,
      }),
  })
}

export function createMinistry(data: {
  name: string
  portfolio: string | null
  minister: string | null
  website: string | null
}): Promise<MinistryRow> {
  const now = BigInt(nowUnixSeconds())

  return prisma.ministry.create({
    data: {
      id: generateId('ministry'),
      ...data,
      createdAt: now,
      updatedAt: now,
    },
    select: MINISTRY_SELECT,
  })
}

export async function updateMinistry(
  ministryId: string,
  data: Record<string, unknown>
): Promise<MinistryRow | null> {
  const exists = await prisma.ministry.findUnique({
    where: { id: ministryId },
    select: { id: true },
  })
  if (!exists) return null

  return prisma.ministry.update({
    where: { id: ministryId },
    data: { ...data, updatedAt: BigInt(nowUnixSeconds()) },
    select: MINISTRY_SELECT,
  })
}

export async function deleteMinistry(
  ministryId: string,
  deletedBy: string | null = null,
  reason: string | null = null
): Promise<boolean> {
  if (shouldSoftDelete()) {
    const result = await prisma.ministry.updateMany({
      where: { id: ministryId, deletedAt: null },
      data: deletionValues(deletedBy, reason),
    })
    return result.count > 0
  }

  const result = await prisma.ministry.deleteMany({ where: { id: ministryId } })
  return result.count > 0
}

// --- Ministry departments ---

export function findMinistryDepartmentById(
  departmentId: string,
  includeDeleted = false
): Promise<MinistryDepartmentRow | null> {
  return prisma.ministryDepartment.findFirst({
    where: { id: departmentId, ...liveOnly(includeDeleted) },
    select: MINISTRY_DEPARTMENT_SELECT,
  })
}

export function listMinistryDepartments(
  ministryId: string,
  query: PaginationQuery,
  options: { includeDeleted: boolean; search?: string | undefined }
): Promise<{ data: MinistryDepartmentRow[]; hasMore: boolean }> {
  const where = {
    ministryId,
    ...liveOnly(options.includeDeleted),
    ...nameSearch(options.search),
  }

  return paginateByCursor<MinistryDepartmentRow>({
    query,
    loadAnchor: (id) => findMinistryDepartmentById(id, options.includeDeleted),
    cursorOf: (row) => row.createdAt,
    fetch: ({ take, cursor, order }) =>
      prisma.ministryDepartment.findMany({
        where: cursor
          ? {
              AND: [where, { createdAt: { [cursor.direction]: cursor.value } }],
            }
          : where,
        orderBy: { createdAt: order },
        take,
        select: MINISTRY_DEPARTMENT_SELECT,
      }),
  })
}

export function createMinistryDepartment(
  ministryId: string,
  data: {
    name: string
    description: string | null
    contactEmail: string | null
    contactNumber: string | null
    address: DirectoryAddressCreate
  }
): Promise<MinistryDepartmentRow> {
  const now = BigInt(nowUnixSeconds())

  return prisma.ministryDepartment.create({
    data: {
      id: generateId('ministryDepartment'),
      ministry: { connect: { id: ministryId } },
      name: data.name,
      description: data.description,
      contactEmail: data.contactEmail,
      contactNumber: data.contactNumber,
      createdAt: now,
      updatedAt: now,
      directoryAddress: { create: addressCreateData(data.address, now) },
    },
    select: MINISTRY_DEPARTMENT_SELECT,
  })
}

export async function updateMinistryDepartment(
  departmentId: string,
  data: Record<string, unknown>,
  address?: DirectoryAddressUpdate | null
): Promise<MinistryDepartmentRow | null> {
  const exists = await prisma.ministryDepartment.findUnique({
    where: { id: departmentId },
    select: { id: true },
  })
  if (!exists) return null

  const now = BigInt(nowUnixSeconds())

  return prisma.ministryDepartment.update({
    where: { id: departmentId },
    data: {
      ...data,
      updatedAt: now,
      ...(address
        ? { directoryAddress: { update: addressUpdateData(address, now) } }
        : {}),
    },
    select: MINISTRY_DEPARTMENT_SELECT,
  })
}

export async function deleteMinistryDepartment(
  departmentId: string,
  deletedBy: string | null = null,
  reason: string | null = null
): Promise<boolean> {
  if (shouldSoftDelete()) {
    const result = await prisma.ministryDepartment.updateMany({
      where: { id: departmentId, deletedAt: null },
      data: deletionValues(deletedBy, reason),
    })
    return result.count > 0
  }

  const result = await prisma.ministryDepartment.deleteMany({
    where: { id: departmentId },
  })
  return result.count > 0
}
