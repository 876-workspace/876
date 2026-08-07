/** Government directory business rules. */

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
import * as repository from './government.repository'
import type {
  Ministry,
  MinistryCreate,
  MinistryDepartment,
  MinistryDepartmentCreate,
  MinistryDepartmentUpdate,
  MinistryUpdate,
} from './government.schemas'
import {
  serializeMinistry,
  serializeMinistryDepartment,
} from './government.serializers'

const MINISTRY_ABSENT = 'No ministry exists with the provided identifier.'
const DEPARTMENT_ABSENT =
  'No ministry department exists with the provided identifier.'

const DEPARTMENT_FIELD_MAP = {
  contact_email: 'contactEmail',
  contact_number: 'contactNumber',
}

// --- Ministries ---

export async function listMinistries(
  query: ListDirectoryQuery,
  isInternal: boolean
): Promise<ListObject<Ministry>> {
  const { data, hasMore } = await repository.listMinistries(query, {
    includeDeleted: resolveIncludeDeleted(query.include_deleted, isInternal),
    search: query.search,
  })

  return listObject({
    data: data.map(serializeMinistry),
    hasMore,
    url: '/directory/ministries',
  })
}

export async function retrieveMinistry(
  ministryId: string,
  query: RetrieveDirectoryQuery,
  isInternal: boolean
): Promise<Ministry> {
  const row = await repository.findMinistryById(
    ministryId,
    resolveIncludeDeleted(query.include_deleted, isInternal)
  )
  if (!row) throw notFound('ministry', MINISTRY_ABSENT)

  return serializeMinistry(row)
}

export async function createMinistry(body: MinistryCreate): Promise<Ministry> {
  const row = await repository.createMinistry({
    name: body.name,
    portfolio: body.portfolio ?? null,
    minister: body.minister ?? null,
    website: body.website ?? null,
  })

  return serializeMinistry(row)
}

export async function updateMinistry(
  ministryId: string,
  body: MinistryUpdate
): Promise<Ministry> {
  const data = sentFields(body)
  if (Object.keys(data).length === 0) throw noFieldsToUpdate()

  const row = await repository.updateMinistry(ministryId, data)
  if (!row) throw notFound('ministry', MINISTRY_ABSENT)

  return serializeMinistry(row)
}

export async function deleteMinistry(
  ministryId: string,
  deletedBy: string | null
): Promise<{ object: 'ministry'; id: string; deleted: true }> {
  const deleted = await repository.deleteMinistry(ministryId, deletedBy)
  if (!deleted) throw notFound('ministry', MINISTRY_ABSENT)

  return { object: 'ministry', id: ministryId, deleted: true }
}

// --- Ministry departments ---

export async function listMinistryDepartments(
  ministryId: string,
  query: ListDirectoryQuery,
  isInternal: boolean
): Promise<ListObject<MinistryDepartment>> {
  const includeDeleted = resolveIncludeDeleted(
    query.include_deleted,
    isInternal
  )

  const ministry = await repository.findMinistryById(ministryId, includeDeleted)
  if (!ministry) throw notFound('ministry', MINISTRY_ABSENT)

  const { data, hasMore } = await repository.listMinistryDepartments(
    ministryId,
    query,
    { includeDeleted, search: query.search }
  )

  return listObject({
    data: data.map(serializeMinistryDepartment),
    hasMore,
    url: `/directory/ministries/${ministryId}/departments`,
  })
}

export async function retrieveMinistryDepartment(
  departmentId: string,
  query: RetrieveDirectoryQuery,
  isInternal: boolean
): Promise<MinistryDepartment> {
  const row = await repository.findMinistryDepartmentById(
    departmentId,
    resolveIncludeDeleted(query.include_deleted, isInternal)
  )
  if (!row) throw notFound('ministry_department', DEPARTMENT_ABSENT)

  return serializeMinistryDepartment(row)
}

export async function createMinistryDepartment(
  ministryId: string,
  body: MinistryDepartmentCreate
): Promise<MinistryDepartment> {
  const ministry = await repository.findMinistryById(ministryId)
  if (!ministry) throw notFound('ministry', MINISTRY_ABSENT)

  const row = await repository.createMinistryDepartment(ministryId, {
    name: body.name,
    description: body.description ?? null,
    contactEmail: body.contact_email ?? null,
    contactNumber: body.contact_number ?? null,
    address: body.address,
  })

  return serializeMinistryDepartment(row)
}

export async function updateMinistryDepartment(
  departmentId: string,
  body: MinistryDepartmentUpdate
): Promise<MinistryDepartment> {
  const data = sentFields(body, ['address'])
  if (Object.keys(data).length === 0 && body.address == null)
    throw noFieldsToUpdate()

  const row = await repository.updateMinistryDepartment(
    departmentId,
    renameKeys(data, DEPARTMENT_FIELD_MAP),
    body.address
  )
  if (!row) throw notFound('ministry_department', DEPARTMENT_ABSENT)

  return serializeMinistryDepartment(row)
}

export async function deleteMinistryDepartment(
  departmentId: string,
  deletedBy: string | null
): Promise<{ object: 'ministry_department'; id: string; deleted: true }> {
  const deleted = await repository.deleteMinistryDepartment(
    departmentId,
    deletedBy
  )
  if (!deleted) throw notFound('ministry_department', DEPARTMENT_ABSENT)

  return { object: 'ministry_department', id: departmentId, deleted: true }
}
