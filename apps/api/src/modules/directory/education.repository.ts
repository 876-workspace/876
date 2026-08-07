/** Every query against the education directory tables. */

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
  SECONDARY_SCHOOL_SELECT,
  UNIVERSITY_CAMPUS_SELECT,
  UNIVERSITY_SELECT,
  type SecondarySchoolRow,
  type UniversityCampusRow,
  type UniversityRow,
} from './education.serializers'

// --- Universities ---

export function findUniversityById(
  universityId: string,
  includeDeleted = false
): Promise<UniversityRow | null> {
  return prisma.university.findFirst({
    where: { id: universityId, ...liveOnly(includeDeleted) },
    select: UNIVERSITY_SELECT,
  })
}

export function listUniversities(
  query: PaginationQuery,
  options: { includeDeleted: boolean; search?: string | undefined }
): Promise<{ data: UniversityRow[]; hasMore: boolean }> {
  const where = {
    ...liveOnly(options.includeDeleted),
    ...nameSearch(options.search),
  }

  return paginateByCursor<UniversityRow>({
    query,
    loadAnchor: (id) => findUniversityById(id, options.includeDeleted),
    cursorOf: (row) => row.createdAt,
    fetch: ({ take, cursor, order }) =>
      prisma.university.findMany({
        where: cursor
          ? {
              AND: [where, { createdAt: { [cursor.direction]: cursor.value } }],
            }
          : where,
        orderBy: { createdAt: order },
        take,
        select: UNIVERSITY_SELECT,
      }),
  })
}

export function createUniversity(data: {
  name: string
  acronym: string | null
  logoUrl: string | null
  website: string | null
}): Promise<UniversityRow> {
  const now = BigInt(nowUnixSeconds())

  return prisma.university.create({
    data: {
      id: generateId('university'),
      ...data,
      createdAt: now,
      updatedAt: now,
    },
    select: UNIVERSITY_SELECT,
  })
}

export async function updateUniversity(
  universityId: string,
  data: Record<string, unknown>
): Promise<UniversityRow | null> {
  const exists = await prisma.university.findUnique({
    where: { id: universityId },
    select: { id: true },
  })
  if (!exists) return null

  return prisma.university.update({
    where: { id: universityId },
    data: { ...data, updatedAt: BigInt(nowUnixSeconds()) },
    select: UNIVERSITY_SELECT,
  })
}

export async function deleteUniversity(
  universityId: string,
  deletedBy: string | null = null,
  reason: string | null = null
): Promise<boolean> {
  if (shouldSoftDelete()) {
    const result = await prisma.university.updateMany({
      where: { id: universityId, deletedAt: null },
      data: deletionValues(deletedBy, reason),
    })
    return result.count > 0
  }

  const result = await prisma.university.deleteMany({
    where: { id: universityId },
  })
  return result.count > 0
}

// --- University campuses ---

export function findUniversityCampusById(
  campusId: string,
  includeDeleted = false
): Promise<UniversityCampusRow | null> {
  return prisma.universityCampus.findFirst({
    where: { id: campusId, ...liveOnly(includeDeleted) },
    select: UNIVERSITY_CAMPUS_SELECT,
  })
}

export function listUniversityCampuses(
  universityId: string,
  query: PaginationQuery,
  options: { includeDeleted: boolean; search?: string | undefined }
): Promise<{ data: UniversityCampusRow[]; hasMore: boolean }> {
  const where = {
    universityId,
    ...liveOnly(options.includeDeleted),
    ...nameSearch(options.search),
  }

  return paginateByCursor<UniversityCampusRow>({
    query,
    loadAnchor: (id) => findUniversityCampusById(id, options.includeDeleted),
    cursorOf: (row) => row.createdAt,
    fetch: ({ take, cursor, order }) =>
      prisma.universityCampus.findMany({
        where: cursor
          ? {
              AND: [where, { createdAt: { [cursor.direction]: cursor.value } }],
            }
          : where,
        orderBy: { createdAt: order },
        take,
        select: UNIVERSITY_CAMPUS_SELECT,
      }),
  })
}

export function createUniversityCampus(
  universityId: string,
  data: {
    name: string
    isMainCampus: boolean
    contactNumber: string | null
    email: string | null
    address: DirectoryAddressCreate
  }
): Promise<UniversityCampusRow> {
  const now = BigInt(nowUnixSeconds())

  return prisma.universityCampus.create({
    data: {
      id: generateId('universityCampus'),
      university: { connect: { id: universityId } },
      name: data.name,
      isMainCampus: data.isMainCampus,
      contactNumber: data.contactNumber,
      email: data.email,
      createdAt: now,
      updatedAt: now,
      directoryAddress: { create: addressCreateData(data.address, now) },
    },
    select: UNIVERSITY_CAMPUS_SELECT,
  })
}

export async function updateUniversityCampus(
  campusId: string,
  data: Record<string, unknown>,
  address?: DirectoryAddressUpdate | null
): Promise<UniversityCampusRow | null> {
  const exists = await prisma.universityCampus.findUnique({
    where: { id: campusId },
    select: { id: true },
  })
  if (!exists) return null

  const now = BigInt(nowUnixSeconds())

  return prisma.universityCampus.update({
    where: { id: campusId },
    data: {
      ...data,
      updatedAt: now,
      ...(address
        ? { directoryAddress: { update: addressUpdateData(address, now) } }
        : {}),
    },
    select: UNIVERSITY_CAMPUS_SELECT,
  })
}

export async function deleteUniversityCampus(
  campusId: string,
  deletedBy: string | null = null,
  reason: string | null = null
): Promise<boolean> {
  if (shouldSoftDelete()) {
    const result = await prisma.universityCampus.updateMany({
      where: { id: campusId, deletedAt: null },
      data: deletionValues(deletedBy, reason),
    })
    return result.count > 0
  }

  const result = await prisma.universityCampus.deleteMany({
    where: { id: campusId },
  })
  return result.count > 0
}

// --- Secondary schools ---

export function findSecondarySchoolById(
  schoolId: string,
  includeDeleted = false
): Promise<SecondarySchoolRow | null> {
  return prisma.secondarySchool.findFirst({
    where: { id: schoolId, ...liveOnly(includeDeleted) },
    select: SECONDARY_SCHOOL_SELECT,
  })
}

export function listSecondarySchools(
  query: PaginationQuery,
  options: { includeDeleted: boolean; search?: string | undefined }
): Promise<{ data: SecondarySchoolRow[]; hasMore: boolean }> {
  const where = {
    ...liveOnly(options.includeDeleted),
    ...nameSearch(options.search),
  }

  return paginateByCursor<SecondarySchoolRow>({
    query,
    loadAnchor: (id) => findSecondarySchoolById(id, options.includeDeleted),
    cursorOf: (row) => row.createdAt,
    fetch: ({ take, cursor, order }) =>
      prisma.secondarySchool.findMany({
        where: cursor
          ? {
              AND: [where, { createdAt: { [cursor.direction]: cursor.value } }],
            }
          : where,
        orderBy: { createdAt: order },
        take,
        select: SECONDARY_SCHOOL_SELECT,
      }),
  })
}

export function createSecondarySchool(data: {
  name: string
  principal: string | null
  schoolType: string | null
  logoUrl: string | null
  contactNumber: string | null
  email: string | null
  address: DirectoryAddressCreate
}): Promise<SecondarySchoolRow> {
  const now = BigInt(nowUnixSeconds())

  return prisma.secondarySchool.create({
    data: {
      id: generateId('secondarySchool'),
      name: data.name,
      principal: data.principal,
      schoolType: data.schoolType,
      logoUrl: data.logoUrl,
      contactNumber: data.contactNumber,
      email: data.email,
      createdAt: now,
      updatedAt: now,
      directoryAddress: { create: addressCreateData(data.address, now) },
    },
    select: SECONDARY_SCHOOL_SELECT,
  })
}

export async function updateSecondarySchool(
  schoolId: string,
  data: Record<string, unknown>,
  address?: DirectoryAddressUpdate | null
): Promise<SecondarySchoolRow | null> {
  const exists = await prisma.secondarySchool.findUnique({
    where: { id: schoolId },
    select: { id: true },
  })
  if (!exists) return null

  const now = BigInt(nowUnixSeconds())

  return prisma.secondarySchool.update({
    where: { id: schoolId },
    data: {
      ...data,
      updatedAt: now,
      ...(address
        ? { directoryAddress: { update: addressUpdateData(address, now) } }
        : {}),
    },
    select: SECONDARY_SCHOOL_SELECT,
  })
}

export async function deleteSecondarySchool(
  schoolId: string,
  deletedBy: string | null = null,
  reason: string | null = null
): Promise<boolean> {
  if (shouldSoftDelete()) {
    const result = await prisma.secondarySchool.updateMany({
      where: { id: schoolId, deletedAt: null },
      data: deletionValues(deletedBy, reason),
    })
    return result.count > 0
  }

  const result = await prisma.secondarySchool.deleteMany({
    where: { id: schoolId },
  })
  return result.count > 0
}
