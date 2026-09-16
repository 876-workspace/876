import { getError, type ProjectsError } from '../../http/errors.js'
import { generateId } from '../../platform/ids.js'
import { nowUnixSeconds, toDbUnixSeconds } from '../../platform/timestamps.js'
import * as projects from '../projects/index.js'
import * as tenants from '../tenants/index.js'
import {
  buildCustomFieldValueData,
  customFieldOptionKeys,
  missingRequiredFieldKey,
} from './field-values.js'
import * as repository from './project-custom-fields.repository.js'
import {
  serializeProjectCustomField,
  serializeProjectCustomFieldValue,
  type ProjectCustomFieldRow,
  type ProjectCustomFieldValueRow,
  type SerializedProjectCustomField,
  type SerializedProjectCustomFieldTombstone,
  type SerializedProjectCustomFieldValue,
} from './project-custom-fields.serializers.js'
import type {
  CreateProjectCustomFieldBody,
  SetProjectCustomFieldValuesBody,
  UpdateProjectCustomFieldBody,
} from './project-custom-fields.schemas.js'

export type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: ProjectsError }

function now() {
  return toDbUnixSeconds(nowUnixSeconds())
}

async function resolveTenant(organizationId: string) {
  const tenant = await tenants.resolveTenant(organizationId)
  return tenant
    ? { tenant, error: null }
    : { tenant: null, error: getError('projects/tenant-not-found') }
}

async function resolveProject(tenantId: string, projectId: string) {
  const project = await projects.resolveProject(tenantId, projectId)
  return project
    ? { project, error: null }
    : { project: null, error: getError('projects/project-not-found') }
}

export async function listCustomFields(
  organizationId: string
): Promise<ServiceResult<SerializedProjectCustomField[]>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  return {
    data: (await repository.listProjectCustomFields(resolved.tenant.id)).map(
      (row) => serializeProjectCustomField(row as ProjectCustomFieldRow)
    ),
    error: null,
  }
}

export async function createCustomField(
  organizationId: string,
  body: CreateProjectCustomFieldBody
): Promise<ServiceResult<SerializedProjectCustomField>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  if (
    await repository.retrieveProjectCustomFieldByKey(
      resolved.tenant.id,
      body.key
    )
  )
    return { data: null, error: getError('projects/custom-field-key-taken') }
  if (
    (body.fieldType === 'select' || body.fieldType === 'multi-select') &&
    customFieldOptionKeys(body.options).length === 0
  )
    return { data: null, error: getError('projects/invalid-request') }
  const timestamp = now()
  const row = await repository.createProjectCustomField({
    id: generateId('projectCustomField'),
    tenantId: resolved.tenant.id,
    key: body.key,
    label: body.label,
    fieldType: body.fieldType,
    options: body.options ?? undefined,
    required: body.required ?? false,
    description: body.description ?? null,
    position: body.position ?? 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  return {
    data: serializeProjectCustomField(row as ProjectCustomFieldRow),
    error: null,
  }
}

export async function updateCustomField(
  organizationId: string,
  fieldId: string,
  body: UpdateProjectCustomFieldBody
): Promise<ServiceResult<SerializedProjectCustomField>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const existing = await repository.retrieveProjectCustomField(
    resolved.tenant.id,
    fieldId
  )
  if (!existing)
    return { data: null, error: getError('projects/custom-field-not-found') }
  const nextType = body.fieldType ?? existing.fieldType
  const nextOptions = body.options ?? existing.options
  const isOptionType = nextType === 'select' || nextType === 'multi-select'
  if (isOptionType && customFieldOptionKeys(nextOptions).length === 0)
    return { data: null, error: getError('projects/invalid-request') }
  if (!isOptionType && body.options !== undefined)
    return { data: null, error: getError('projects/invalid-request') }
  const row = await repository.updateProjectCustomField(fieldId, {
    ...body,
    updatedAt: now(),
  })
  return {
    data: serializeProjectCustomField(row as ProjectCustomFieldRow),
    error: null,
  }
}

export async function deleteCustomField(
  organizationId: string,
  fieldId: string
): Promise<ServiceResult<SerializedProjectCustomFieldTombstone>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const existing = await repository.retrieveProjectCustomField(
    resolved.tenant.id,
    fieldId
  )
  if (!existing)
    return { data: null, error: getError('projects/custom-field-not-found') }
  await repository.archiveProjectCustomField(fieldId, now())
  return {
    data: {
      object: 'projects.project-custom-field' as const,
      id: fieldId,
      deleted: true as const,
    },
    error: null,
  }
}

export async function listCustomFieldValues(
  organizationId: string,
  projectId: string
): Promise<ServiceResult<SerializedProjectCustomFieldValue[]>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const project = await resolveProject(resolved.tenant.id, projectId)
  if (project.error) return { data: null, error: project.error }
  return {
    data: (
      await repository.listProjectCustomFieldValues(
        resolved.tenant.id,
        project.project.id
      )
    ).map((row) =>
      serializeProjectCustomFieldValue(row as ProjectCustomFieldValueRow)
    ),
    error: null,
  }
}

export async function setCustomFieldValues(
  organizationId: string,
  projectId: string,
  body: SetProjectCustomFieldValuesBody
): Promise<ServiceResult<SerializedProjectCustomFieldValue[]>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const project = await resolveProject(resolved.tenant.id, projectId)
  if (project.error) return { data: null, error: project.error }
  const fields = await repository.listProjectCustomFields(resolved.tenant.id)
  const byId = new Map(fields.map((field) => [field.id, field]))
  const seen = new Set<string>()
  for (const input of body.customFields) {
    if (seen.has(input.fieldId))
      return { data: null, error: getError('projects/invalid-request') }
    seen.add(input.fieldId)
    const field = byId.get(input.fieldId)
    if (!field)
      return { data: null, error: getError('projects/custom-field-not-found') }
    const parsed = buildCustomFieldValueData(field, input.value)
    if (parsed.error) return { data: null, error: parsed.error }
  }
  const missingKey = missingRequiredFieldKey(
    fields,
    body.customFields,
    new Set<string>()
  )
  if (missingKey)
    return {
      data: null,
      error: getError('projects/required-custom-field-missing', {
        param: missingKey,
      }),
    }

  const timestamp = now()
  for (const input of body.customFields) {
    const field = byId.get(input.fieldId)
    if (!field) continue
    const parsed = buildCustomFieldValueData(field, input.value)
    if (parsed.error) return { data: null, error: parsed.error }
    if (!parsed.data) {
      await repository.clearProjectCustomFieldValue(
        resolved.tenant.id,
        project.project.id,
        field.id
      )
      continue
    }
    await repository.upsertProjectCustomFieldValue({
      id: generateId('projectCustomFieldValue'),
      tenantId: resolved.tenant.id,
      projectId: project.project.id,
      fieldId: field.id,
      ...parsed.data,
      updatedBy: body.updatedBy ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
  }
  return listCustomFieldValues(organizationId, project.project.id)
}

export async function listCustomFieldValuesForTenant(
  tenantId: string,
  projectId: string
): Promise<SerializedProjectCustomFieldValue[]> {
  return (
    await repository.listProjectCustomFieldValues(tenantId, projectId)
  ).map((row) =>
    serializeProjectCustomFieldValue(row as ProjectCustomFieldValueRow)
  )
}

export async function listCustomFieldValuesForProjects(
  tenantId: string,
  projectIds: string[]
): Promise<Map<string, SerializedProjectCustomFieldValue[]>> {
  const rows =
    await repository.listProjectCustomFieldValuesForProjects(
      tenantId,
      projectIds
    )
  const grouped = new Map<string, SerializedProjectCustomFieldValue[]>()
  for (const row of rows) {
    const serialized = serializeProjectCustomFieldValue(
      row as ProjectCustomFieldValueRow
    )
    const existing = grouped.get(row.projectId) ?? []
    existing.push(serialized)
    grouped.set(row.projectId, existing)
  }
  return grouped
}
