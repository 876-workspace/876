/** Education directory business rules. */

import { listObject, type ListObject } from '@/http/envelope'

import { renameKeys } from './directory.repository'
import type {
  ListDirectoryQuery,
  RetrieveDirectoryQuery,
} from './directory.schemas'
import {
  noFieldsToUpdate,
  notFound,
  resolveIncludeDeleted,
  sentFields,
} from './directory.service'
import * as repository from './education.repository'
import type {
  SecondarySchool,
  SecondarySchoolCreate,
  SecondarySchoolUpdate,
  University,
  UniversityCampus,
  UniversityCampusCreate,
  UniversityCampusUpdate,
  UniversityCreate,
  UniversityUpdate,
} from './education.schemas'
import {
  serializeSecondarySchool,
  serializeUniversity,
  serializeUniversityCampus,
} from './education.serializers'

const UNIVERSITY_ABSENT = 'No university exists with the provided identifier.'
const CAMPUS_ABSENT =
  'No university campus exists with the provided identifier.'
const SCHOOL_ABSENT = 'No secondary school exists with the provided identifier.'

const UNIVERSITY_FIELD_MAP = { logo_url: 'logoUrl' }
const CAMPUS_FIELD_MAP = {
  is_main_campus: 'isMainCampus',
  contact_number: 'contactNumber',
}
const SCHOOL_FIELD_MAP = {
  school_type: 'schoolType',
  logo_url: 'logoUrl',
  contact_number: 'contactNumber',
}

// --- Universities ---

export async function listUniversities(
  query: ListDirectoryQuery,
  isInternal: boolean
): Promise<ListObject<University>> {
  const { data, hasMore } = await repository.listUniversities(query, {
    includeDeleted: resolveIncludeDeleted(query.include_deleted, isInternal),
    search: query.search,
  })

  return listObject({
    data: data.map(serializeUniversity),
    hasMore,
    url: '/directory/universities',
  })
}

export async function retrieveUniversity(
  universityId: string,
  query: RetrieveDirectoryQuery,
  isInternal: boolean
): Promise<University> {
  const row = await repository.findUniversityById(
    universityId,
    resolveIncludeDeleted(query.include_deleted, isInternal)
  )
  if (!row) throw notFound('university', UNIVERSITY_ABSENT)

  return serializeUniversity(row)
}

export async function createUniversity(
  body: UniversityCreate
): Promise<University> {
  const row = await repository.createUniversity({
    name: body.name,
    acronym: body.acronym ?? null,
    logoUrl: body.logo_url ?? null,
    website: body.website ?? null,
  })

  return serializeUniversity(row)
}

export async function updateUniversity(
  universityId: string,
  body: UniversityUpdate
): Promise<University> {
  const data = sentFields(body)
  if (Object.keys(data).length === 0) throw noFieldsToUpdate()

  const row = await repository.updateUniversity(
    universityId,
    renameKeys(data, UNIVERSITY_FIELD_MAP)
  )
  if (!row) throw notFound('university', UNIVERSITY_ABSENT)

  return serializeUniversity(row)
}

export async function deleteUniversity(
  universityId: string,
  deletedBy: string | null
): Promise<{ object: 'university'; id: string; deleted: true }> {
  const deleted = await repository.deleteUniversity(universityId, deletedBy)
  if (!deleted) throw notFound('university', UNIVERSITY_ABSENT)

  return { object: 'university', id: universityId, deleted: true }
}

// --- University campuses ---

export async function listUniversityCampuses(
  universityId: string,
  query: ListDirectoryQuery,
  isInternal: boolean
): Promise<ListObject<UniversityCampus>> {
  const includeDeleted = resolveIncludeDeleted(
    query.include_deleted,
    isInternal
  )

  const university = await repository.findUniversityById(
    universityId,
    includeDeleted
  )
  if (!university) throw notFound('university', UNIVERSITY_ABSENT)

  const { data, hasMore } = await repository.listUniversityCampuses(
    universityId,
    query,
    { includeDeleted, search: query.search }
  )

  return listObject({
    data: data.map(serializeUniversityCampus),
    hasMore,
    url: `/directory/universities/${universityId}/campuses`,
  })
}

export async function retrieveUniversityCampus(
  campusId: string,
  query: RetrieveDirectoryQuery,
  isInternal: boolean
): Promise<UniversityCampus> {
  const row = await repository.findUniversityCampusById(
    campusId,
    resolveIncludeDeleted(query.include_deleted, isInternal)
  )
  if (!row) throw notFound('university_campus', CAMPUS_ABSENT)

  return serializeUniversityCampus(row)
}

export async function createUniversityCampus(
  universityId: string,
  body: UniversityCampusCreate
): Promise<UniversityCampus> {
  const university = await repository.findUniversityById(universityId)
  if (!university) throw notFound('university', UNIVERSITY_ABSENT)

  const row = await repository.createUniversityCampus(universityId, {
    name: body.name,
    isMainCampus: body.is_main_campus,
    contactNumber: body.contact_number ?? null,
    email: body.email ?? null,
    address: body.address,
  })

  return serializeUniversityCampus(row)
}

export async function updateUniversityCampus(
  campusId: string,
  body: UniversityCampusUpdate
): Promise<UniversityCampus> {
  const data = sentFields(body, ['address'])
  if (Object.keys(data).length === 0 && body.address == null)
    throw noFieldsToUpdate()

  const row = await repository.updateUniversityCampus(
    campusId,
    renameKeys(data, CAMPUS_FIELD_MAP),
    body.address
  )
  if (!row) throw notFound('university_campus', CAMPUS_ABSENT)

  return serializeUniversityCampus(row)
}

export async function deleteUniversityCampus(
  campusId: string,
  deletedBy: string | null
): Promise<{ object: 'university_campus'; id: string; deleted: true }> {
  const deleted = await repository.deleteUniversityCampus(campusId, deletedBy)
  if (!deleted) throw notFound('university_campus', CAMPUS_ABSENT)

  return { object: 'university_campus', id: campusId, deleted: true }
}

// --- Secondary schools ---

export async function listSecondarySchools(
  query: ListDirectoryQuery,
  isInternal: boolean
): Promise<ListObject<SecondarySchool>> {
  const { data, hasMore } = await repository.listSecondarySchools(query, {
    includeDeleted: resolveIncludeDeleted(query.include_deleted, isInternal),
    search: query.search,
  })

  return listObject({
    data: data.map(serializeSecondarySchool),
    hasMore,
    url: '/directory/schools',
  })
}

export async function retrieveSecondarySchool(
  schoolId: string,
  query: RetrieveDirectoryQuery,
  isInternal: boolean
): Promise<SecondarySchool> {
  const row = await repository.findSecondarySchoolById(
    schoolId,
    resolveIncludeDeleted(query.include_deleted, isInternal)
  )
  if (!row) throw notFound('secondary_school', SCHOOL_ABSENT)

  return serializeSecondarySchool(row)
}

export async function createSecondarySchool(
  body: SecondarySchoolCreate
): Promise<SecondarySchool> {
  const row = await repository.createSecondarySchool({
    name: body.name,
    principal: body.principal ?? null,
    schoolType: body.school_type ?? null,
    logoUrl: body.logo_url ?? null,
    contactNumber: body.contact_number ?? null,
    email: body.email ?? null,
    address: body.address,
  })

  return serializeSecondarySchool(row)
}

export async function updateSecondarySchool(
  schoolId: string,
  body: SecondarySchoolUpdate
): Promise<SecondarySchool> {
  const data = sentFields(body, ['address'])
  if (Object.keys(data).length === 0 && body.address == null)
    throw noFieldsToUpdate()

  const row = await repository.updateSecondarySchool(
    schoolId,
    renameKeys(data, SCHOOL_FIELD_MAP),
    body.address
  )
  if (!row) throw notFound('secondary_school', SCHOOL_ABSENT)

  return serializeSecondarySchool(row)
}

export async function deleteSecondarySchool(
  schoolId: string,
  deletedBy: string | null
): Promise<{ object: 'secondary_school'; id: string; deleted: true }> {
  const deleted = await repository.deleteSecondarySchool(schoolId, deletedBy)
  if (!deleted) throw notFound('secondary_school', SCHOOL_ABSENT)

  return { object: 'secondary_school', id: schoolId, deleted: true }
}
