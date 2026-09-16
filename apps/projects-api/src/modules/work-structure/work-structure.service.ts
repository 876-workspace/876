import { getError, type ProjectsError } from '../../http/errors.js'
import { generateId } from '../../platform/ids.js'
import {
  nowUnixSeconds,
  nullableToDbUnixSeconds,
  toDbUnixSeconds,
} from '../../platform/timestamps.js'
import {
  buildCustomFieldValueData,
  customFieldOptionKeys,
  missingRequiredFieldKey,
} from '../custom-fields/field-values.js'
import * as issues from '../issues/index.js'
import * as projects from '../projects/index.js'
import * as tenants from '../tenants/index.js'
import * as cyclesRepository from './cycles.repository.js'
import { getWorkStructurePreset, workStructurePresets } from './presets.js'
import * as taskListsRepository from './task-lists.repository.js'
import * as repository from './work-structure.repository.js'
import type {
  CreateCustomFieldBody,
  CreateMilestoneBody,
  CreateWorkItemTypeBody,
  CreateWorkflowStateBody,
  CustomFieldValueInput,
  UpdateCustomFieldBody,
  UpdateMilestoneBody,
  UpdateWorkItemTypeBody,
  UpdateWorkflowStateBody,
} from './work-structure.schemas.js'
import {
  serializeCustomField,
  serializeCustomFieldValue,
  serializeMilestone,
  serializeWorkItemType,
  serializeWorkflowState,
  type CustomFieldValueRow,
  type SerializedCustomField,
  type SerializedCustomFieldValue,
  type MilestoneRow,
  type SerializedMilestone,
  type SerializedWorkItemType,
  type SerializedWorkflowState,
} from './work-structure.serializers.js'

export type ServiceResult<T> =
  { data: T; error: null } | { data: null; error: ProjectsError }

async function resolveTenant(organizationId: string) {
  const tenant = await tenants.resolveTenant(organizationId)
  return tenant
    ? { tenant, error: null }
    : { tenant: null, error: getError('projects/tenant-not-found') }
}

function now() {
  return toDbUnixSeconds(nowUnixSeconds())
}

function isWorkflowCategory(value: string): boolean {
  return ['backlog', 'unstarted', 'started', 'completed', 'canceled'].includes(
    value
  )
}

function isOptionFieldType(value: string): boolean {
  return value === 'select' || value === 'multi-select'
}

async function hasOwnedTypes(
  tenantId: string,
  typeIds: string[]
): Promise<boolean> {
  const types = await Promise.all(
    typeIds.map((typeId) => repository.retrieveWorkItemType(tenantId, typeId))
  )
  return types.every((type) => type !== null)
}

export async function listWorkItemTypes(
  organizationId: string
): Promise<ServiceResult<SerializedWorkItemType[]>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  return {
    data: (await repository.listWorkItemTypes(resolved.tenant.id)).map(
      serializeWorkItemType
    ),
    error: null,
  }
}

export async function createWorkItemType(
  organizationId: string,
  body: CreateWorkItemTypeBody
): Promise<ServiceResult<SerializedWorkItemType>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  if (await repository.retrieveWorkItemTypeByKey(resolved.tenant.id, body.key))
    return { data: null, error: getError('projects/work-item-type-key-taken') }

  const timestamp = now()
  const existingDefault = await repository.retrieveDefaultWorkItemType(
    resolved.tenant.id
  )
  const isDefault = body.isDefault === true || existingDefault === null
  const data = {
    id: generateId('workItemType'),
    tenantId: resolved.tenant.id,
    key: body.key,
    name: body.name,
    iconKey: body.iconKey,
    color: body.color,
    hierarchyLevel: body.hierarchyLevel,
    description: body.description ?? null,
    isDefault,
    position: body.position ?? 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  const row = isDefault
    ? await repository.createDefaultWorkItemType(
        resolved.tenant.id,
        data,
        timestamp
      )
    : await repository.createWorkItemType(data)
  return { data: serializeWorkItemType(row), error: null }
}

export async function retrieveWorkItemType(
  organizationId: string,
  id: string
): Promise<ServiceResult<SerializedWorkItemType>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const row = await repository.retrieveWorkItemType(resolved.tenant.id, id)
  return row
    ? { data: serializeWorkItemType(row), error: null }
    : { data: null, error: getError('projects/work-item-type-not-found') }
}

export async function updateWorkItemType(
  organizationId: string,
  id: string,
  body: UpdateWorkItemTypeBody
): Promise<ServiceResult<SerializedWorkItemType>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const existing = await repository.retrieveWorkItemType(resolved.tenant.id, id)
  if (!existing)
    return { data: null, error: getError('projects/work-item-type-not-found') }
  if (existing.isDefault && body.isDefault === false)
    return {
      data: null,
      error: getError('projects/default-work-item-type-required'),
    }

  const timestamp = now()
  const patch = { ...body, updatedAt: timestamp }
  const row =
    body.isDefault === true && !existing.isDefault
      ? await repository.updateDefaultWorkItemType(
          resolved.tenant.id,
          id,
          patch,
          timestamp
        )
      : await repository.updateWorkItemType(resolved.tenant.id, id, patch)
  return { data: serializeWorkItemType(row), error: null }
}

export async function removeWorkItemType(
  organizationId: string,
  id: string
): Promise<
  ServiceResult<{
    object: 'projects.work-item-type'
    id: string
    deleted: true
  }>
> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const existing = await repository.retrieveWorkItemType(resolved.tenant.id, id)
  if (!existing)
    return { data: null, error: getError('projects/work-item-type-not-found') }
  if (existing.isDefault)
    return {
      data: null,
      error: getError('projects/default-work-item-type-required'),
    }
  if (await repository.countIssuesForWorkItemType(resolved.tenant.id, id))
    return { data: null, error: getError('projects/work-item-type-in-use') }
  await repository.archiveWorkItemType(resolved.tenant.id, id, now())
  return {
    data: { object: 'projects.work-item-type', id, deleted: true },
    error: null,
  }
}

export async function listWorkflowStates(
  organizationId: string
): Promise<ServiceResult<SerializedWorkflowState[]>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  return {
    data: (await repository.listWorkflowStates(resolved.tenant.id)).map(
      serializeWorkflowState
    ),
    error: null,
  }
}

export async function resolveWorkflowStateByKey(tenantId: string, key: string) {
  return repository.retrieveWorkflowStateByKey(tenantId, key)
}

export async function resolveDefaultWorkflowState(tenantId: string) {
  return repository.retrieveDefaultWorkflowState(tenantId)
}

export async function resolveWorkItemTypeByKey(tenantId: string, key: string) {
  return repository.retrieveWorkItemTypeByKey(tenantId, key)
}

export async function resolveWorkItemTypeById(tenantId: string, id: string) {
  return repository.retrieveWorkItemType(tenantId, id)
}

export async function resolveDefaultWorkItemType(tenantId: string) {
  return repository.retrieveDefaultWorkItemType(tenantId)
}

export async function resolveMilestoneById(tenantId: string, id: string) {
  return repository.retrieveMilestone(tenantId, id)
}

export async function resolveTaskListById(tenantId: string, id: string) {
  return taskListsRepository.retrieveTaskList(tenantId, id)
}

export async function resolveCycleById(tenantId: string, id: string) {
  return cyclesRepository.retrieveCycle(tenantId, id)
}

export async function createWorkflowState(
  organizationId: string,
  body: CreateWorkflowStateBody
): Promise<ServiceResult<SerializedWorkflowState>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  if (!isWorkflowCategory(body.category))
    return { data: null, error: getError('projects/invalid-request') }
  if (await repository.retrieveWorkflowStateByKey(resolved.tenant.id, body.key))
    return { data: null, error: getError('projects/workflow-state-key-taken') }

  const timestamp = now()
  const existingDefault = await repository.retrieveDefaultWorkflowState(
    resolved.tenant.id
  )
  const isDefault = body.isDefault === true || existingDefault === null
  const data = {
    id: generateId('workflowState'),
    tenantId: resolved.tenant.id,
    key: body.key,
    name: body.name,
    category: body.category,
    color: body.color,
    description: body.description ?? null,
    isDefault,
    position: body.position ?? 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  const row = isDefault
    ? await repository.createDefaultWorkflowState(
        resolved.tenant.id,
        data,
        timestamp
      )
    : await repository.createWorkflowState(data)
  return { data: serializeWorkflowState(row), error: null }
}

export async function retrieveWorkflowState(
  organizationId: string,
  id: string
): Promise<ServiceResult<SerializedWorkflowState>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const row = await repository.retrieveWorkflowState(resolved.tenant.id, id)
  return row
    ? { data: serializeWorkflowState(row), error: null }
    : { data: null, error: getError('projects/workflow-state-not-found') }
}

export async function updateWorkflowState(
  organizationId: string,
  id: string,
  body: UpdateWorkflowStateBody
): Promise<ServiceResult<SerializedWorkflowState>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const existing = await repository.retrieveWorkflowState(
    resolved.tenant.id,
    id
  )
  if (!existing)
    return { data: null, error: getError('projects/workflow-state-not-found') }
  if (body.category !== undefined && !isWorkflowCategory(body.category))
    return { data: null, error: getError('projects/invalid-request') }
  if (existing.isDefault && body.isDefault === false)
    return {
      data: null,
      error: getError('projects/default-workflow-state-required'),
    }

  const timestamp = now()
  const patch = { ...body, updatedAt: timestamp }
  const row =
    body.isDefault === true && !existing.isDefault
      ? await repository.updateDefaultWorkflowState(
          resolved.tenant.id,
          id,
          patch,
          timestamp
        )
      : await repository.updateWorkflowState(resolved.tenant.id, id, patch)
  return { data: serializeWorkflowState(row), error: null }
}

export async function removeWorkflowState(
  organizationId: string,
  id: string
): Promise<
  ServiceResult<{
    object: 'projects.workflow-state'
    id: string
    deleted: true
  }>
> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const existing = await repository.retrieveWorkflowState(
    resolved.tenant.id,
    id
  )
  if (!existing)
    return { data: null, error: getError('projects/workflow-state-not-found') }
  if (existing.isDefault)
    return {
      data: null,
      error: getError('projects/default-workflow-state-required'),
    }
  if ((await repository.countActiveWorkflowStates(resolved.tenant.id)) <= 1)
    return { data: null, error: getError('projects/workflow-state-required') }
  if (await repository.countIssuesForWorkflowState(resolved.tenant.id, id))
    return { data: null, error: getError('projects/workflow-state-in-use') }
  await repository.archiveWorkflowState(resolved.tenant.id, id, now())
  return {
    data: { object: 'projects.workflow-state', id, deleted: true },
    error: null,
  }
}

async function resolveProject(tenantId: string, projectId: string) {
  const project = await projects.resolveProject(tenantId, projectId)
  return project
    ? { project, error: null }
    : { project: null, error: getError('projects/project-not-found') }
}

export async function listMilestones(
  organizationId: string,
  projectId: string,
  status?: string
): Promise<ServiceResult<SerializedMilestone[]>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const project = await resolveProject(resolved.tenant.id, projectId)
  if (project.error) return { data: null, error: project.error }
  return {
    data: (
      await repository.listMilestones(
        resolved.tenant.id,
        project.project.id,
        status
      )
    ).map(serializeMilestone),
    error: null,
  }
}

export async function createMilestone(
  organizationId: string,
  body: CreateMilestoneBody
): Promise<ServiceResult<SerializedMilestone>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const project = await resolveProject(resolved.tenant.id, body.projectId)
  if (project.error) return { data: null, error: project.error }
  if (
    await repository.retrieveMilestoneByKey(
      resolved.tenant.id,
      project.project.id,
      body.key
    )
  )
    return { data: null, error: getError('projects/milestone-key-taken') }
  const timestamp = now()
  const row = await repository.createMilestone({
    id: generateId('milestone'),
    tenantId: resolved.tenant.id,
    projectId: project.project.id,
    key: body.key,
    name: body.name,
    description: body.description ?? null,
    status: body.status ?? 'open',
    startDate: nullableToDbUnixSeconds(body.startDate),
    targetDate: nullableToDbUnixSeconds(body.targetDate),
    position: body.position ?? 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  return { data: serializeMilestone(row), error: null }
}

export async function retrieveMilestone(
  organizationId: string,
  id: string
): Promise<ServiceResult<SerializedMilestone>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const row = await repository.retrieveMilestone(resolved.tenant.id, id)
  return row
    ? { data: serializeMilestone(row), error: null }
    : { data: null, error: getError('projects/milestone-not-found') }
}

export async function updateMilestone(
  organizationId: string,
  id: string,
  body: UpdateMilestoneBody,
  options?: { client?: repository.WorkStructureTransaction }
): Promise<ServiceResult<SerializedMilestone>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const existing = await repository.retrieveMilestone(resolved.tenant.id, id)
  if (!existing)
    return { data: null, error: getError('projects/milestone-not-found') }
  const timestamp = now()
  const updateData = {
    ...body,
    startDate:
      body.startDate === undefined
        ? undefined
        : nullableToDbUnixSeconds(body.startDate),
    targetDate:
      body.targetDate === undefined
        ? undefined
        : nullableToDbUnixSeconds(body.targetDate),
    completedAt:
      body.status === 'completed'
        ? timestamp
        : body.status === 'open'
          ? null
          : undefined,
    updatedAt: timestamp,
  }
  const row = options?.client
    ? await options.client.milestone.update({ where: { id }, data: updateData })
    : await repository.updateMilestone(resolved.tenant.id, id, updateData)
  return { data: serializeMilestone(row), error: null }
}

export async function removeMilestone(
  organizationId: string,
  id: string
): Promise<
  ServiceResult<{ object: 'projects.milestone'; id: string; deleted: true }>
> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  if (!(await repository.retrieveMilestone(resolved.tenant.id, id)))
    return { data: null, error: getError('projects/milestone-not-found') }
  await repository.deleteMilestone(resolved.tenant.id, id, now())
  return {
    data: { object: 'projects.milestone', id, deleted: true },
    error: null,
  }
}

export async function listCustomFields(
  organizationId: string
): Promise<ServiceResult<SerializedCustomField[]>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  return {
    data: (await repository.listCustomFields(resolved.tenant.id)).map(
      serializeCustomField
    ),
    error: null,
  }
}

export async function createCustomField(
  organizationId: string,
  body: CreateCustomFieldBody
): Promise<ServiceResult<SerializedCustomField>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  if (await repository.retrieveCustomFieldByKey(resolved.tenant.id, body.key))
    return { data: null, error: getError('projects/custom-field-key-taken') }
  if (!(await hasOwnedTypes(resolved.tenant.id, body.typeIds ?? [])))
    return { data: null, error: getError('projects/invalid-request') }
  const timestamp = now()
  const row = await repository.createCustomField(
    {
      id: generateId('customField'),
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
    },
    body.typeIds ?? []
  )
  return { data: serializeCustomField(row), error: null }
}

export async function retrieveCustomField(
  organizationId: string,
  id: string
): Promise<ServiceResult<SerializedCustomField>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const row = await repository.retrieveCustomField(resolved.tenant.id, id)
  return row
    ? { data: serializeCustomField(row), error: null }
    : { data: null, error: getError('projects/custom-field-not-found') }
}

export async function updateCustomField(
  organizationId: string,
  id: string,
  body: UpdateCustomFieldBody
): Promise<ServiceResult<SerializedCustomField>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const existing = await repository.retrieveCustomField(resolved.tenant.id, id)
  if (!existing)
    return { data: null, error: getError('projects/custom-field-not-found') }
  if (
    body.typeIds !== undefined &&
    !(await hasOwnedTypes(resolved.tenant.id, body.typeIds))
  )
    return { data: null, error: getError('projects/invalid-request') }

  const nextFieldType = body.fieldType ?? existing.fieldType
  const wasOptionField = isOptionFieldType(existing.fieldType)
  const willBeOptionField = isOptionFieldType(nextFieldType)
  const nextOptions = body.options ?? existing.options

  if (wasOptionField && !willBeOptionField)
    return { data: null, error: getError('projects/invalid-request') }
  if (willBeOptionField && customFieldOptionKeys(nextOptions).length === 0)
    return { data: null, error: getError('projects/invalid-request') }
  if (!willBeOptionField && body.options !== undefined)
    return { data: null, error: getError('projects/invalid-request') }

  const row = await repository.updateCustomField(
    resolved.tenant.id,
    id,
    {
      label: body.label,
      fieldType: body.fieldType,
      options: body.options,
      required: body.required,
      description: body.description,
      position: body.position,
      updatedAt: now(),
    },
    body.typeIds
  )
  return { data: serializeCustomField(row), error: null }
}

export async function removeCustomField(
  organizationId: string,
  id: string
): Promise<
  ServiceResult<{ object: 'projects.custom-field'; id: string; deleted: true }>
> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  if (!(await repository.retrieveCustomField(resolved.tenant.id, id)))
    return { data: null, error: getError('projects/custom-field-not-found') }
  await repository.archiveCustomField(resolved.tenant.id, id, now())
  return {
    data: { object: 'projects.custom-field', id, deleted: true },
    error: null,
  }
}

function appliesToWorkItemType(
  field: { types?: Array<{ typeId: string }> },
  workItemTypeId: string
) {
  const typeIds = field.types?.map((type) => type.typeId) ?? []
  return typeIds.length === 0 || typeIds.includes(workItemTypeId)
}

export async function validateIssueCustomFieldValues(
  tenantId: string,
  workItemTypeId: string,
  inputs: CustomFieldValueInput[],
  issueId?: string
): Promise<ServiceResult<null>> {
  const fields = await repository.listCustomFields(tenantId)
  const fieldsById = new Map(fields.map((field) => [field.id, field]))
  const inputByFieldId = new Map<string, CustomFieldValueInput>()

  for (const input of inputs) {
    if (inputByFieldId.has(input.fieldId))
      return { data: null, error: getError('projects/invalid-request') }
    const field = fieldsById.get(input.fieldId)
    if (!field)
      return { data: null, error: getError('projects/custom-field-not-found') }
    if (!appliesToWorkItemType(field, workItemTypeId))
      return { data: null, error: getError('projects/invalid-request') }
    const parsed = buildCustomFieldValueData(field, input.value)
    if (parsed.error) return { data: null, error: parsed.error }
    inputByFieldId.set(input.fieldId, input)
  }

  const existingFieldIds = new Set<string>()
  if (issueId) {
    const existingValues = await repository.listCustomFieldValues(
      tenantId,
      issueId
    )
    for (const value of existingValues) existingFieldIds.add(value.fieldId)
  }

  const missingKey = missingRequiredFieldKey(
    fields.filter((field) => appliesToWorkItemType(field, workItemTypeId)),
    inputs,
    existingFieldIds
  )
  if (missingKey)
    return {
      data: null,
      error: getError('projects/required-custom-field-missing', {
        param: missingKey,
      }),
    }

  return { data: null, error: null }
}

export async function setCustomFieldValueForTenant(
  tenantId: string,
  issueId: string,
  input: CustomFieldValueInput,
  updatedBy?: string | null,
  transaction?: repository.WorkStructureTransaction
): Promise<ServiceResult<SerializedCustomFieldValue | null>> {
  const field = await repository.retrieveCustomField(
    tenantId,
    input.fieldId,
    transaction
  )
  if (!field)
    return { data: null, error: getError('projects/custom-field-not-found') }
  const parsed = buildCustomFieldValueData(field, input.value)
  if (parsed.error) return { data: null, error: parsed.error }
  if (!parsed.data) {
    await repository.clearCustomFieldValue(
      tenantId,
      issueId,
      field.id,
      transaction
    )
    return { data: null, error: null }
  }
  const timestamp = now()
  const row = await repository.upsertCustomFieldValue(
    {
      id: generateId('customFieldValue'),
      tenantId,
      issueId,
      fieldId: field.id,
      ...parsed.data,
      updatedBy: updatedBy ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    transaction
  )
  return {
    data: serializeCustomFieldValue(row as CustomFieldValueRow),
    error: null,
  }
}

export async function listCustomFieldValuesForTenant(
  tenantId: string,
  issueId: string,
  transaction?: repository.WorkStructureTransaction
) {
  return (
    await repository.listCustomFieldValues(tenantId, issueId, transaction)
  ).map((row) => serializeCustomFieldValue(row as CustomFieldValueRow))
}

export async function getIssueStructure(
  tenantId: string,
  issue: {
    status: string
    workflowStateId: string | null
    typeKey: string
    workItemTypeId: string | null
    milestoneId: string | null
    id: string
  }
) {
  const [state, type, milestone, customFieldRows] = await Promise.all([
    issue.workflowStateId
      ? repository.retrieveWorkflowState(tenantId, issue.workflowStateId)
      : repository.retrieveWorkflowStateByKey(tenantId, issue.status),
    issue.workItemTypeId
      ? repository.retrieveWorkItemType(tenantId, issue.workItemTypeId)
      : repository.retrieveWorkItemTypeByKey(tenantId, issue.typeKey),
    issue.milestoneId
      ? repository.retrieveMilestone(tenantId, issue.milestoneId)
      : null,
    repository.listCustomFieldValues(tenantId, issue.id),
  ])
  const customFields = customFieldRows
    .filter((row) => !type || appliesToWorkItemType(row.field, type.id))
    .map((row) => serializeCustomFieldValue(row as CustomFieldValueRow))
  return {
    state: state ? serializeWorkflowState(state) : null,
    type: type ? serializeWorkItemType(type) : null,
    milestone: milestone ? serializeMilestone(milestone) : null,
    customFields,
  }
}

export async function setCustomFieldValuesForTenant(
  tenantId: string,
  issueId: string,
  inputs: CustomFieldValueInput[],
  updatedBy?: string | null,
  transaction?: repository.WorkStructureTransaction
): Promise<ServiceResult<SerializedCustomFieldValue[]>> {
  const values: SerializedCustomFieldValue[] = []
  for (const input of inputs) {
    const result = await setCustomFieldValueForTenant(
      tenantId,
      issueId,
      input,
      updatedBy,
      transaction
    )
    if (result.error) return { data: null, error: result.error }
    if (result.data) values.push(result.data)
  }
  return { data: values, error: null }
}

export async function pruneCustomFieldValuesForWorkItemType(
  tenantId: string,
  issueId: string,
  workItemTypeId: string,
  transaction?: repository.WorkStructureTransaction
): Promise<void> {
  const [fields, values] = await Promise.all([
    repository.listCustomFields(tenantId, transaction),
    repository.listCustomFieldValues(tenantId, issueId, transaction),
  ])
  const fieldsById = new Map(fields.map((field) => [field.id, field]))
  for (const value of values) {
    const field = fieldsById.get(value.fieldId)
    if (field && !appliesToWorkItemType(field, workItemTypeId))
      await repository.clearCustomFieldValue(
        tenantId,
        issueId,
        value.fieldId,
        transaction
      )
  }
}

export async function validateCustomFieldValues(
  tenantId: string,
  inputs: CustomFieldValueInput[]
): Promise<ServiceResult<null>> {
  for (const input of inputs) {
    const field = await repository.retrieveCustomField(tenantId, input.fieldId)
    if (!field)
      return { data: null, error: getError('projects/custom-field-not-found') }
    const parsed = buildCustomFieldValueData(field, input.value)
    if (parsed.error) return { data: null, error: parsed.error }
  }
  return { data: null, error: null }
}

export async function resolveIssueForCustomFields(
  organizationId: string,
  issueRef: string
): Promise<ServiceResult<SerializedCustomFieldValue[]>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const issue = await issues.resolveIssue(resolved.tenant.id, issueRef)
  if (!issue || issue.deletedAt !== null)
    return { data: null, error: getError('projects/issue-not-found') }
  const structure = await getIssueStructure(resolved.tenant.id, issue)
  return { data: structure.customFields, error: null }
}

async function resolveIssueWorkItemType(
  tenantId: string,
  issue: { workItemTypeId: string | null; typeKey: string }
) {
  return issue.workItemTypeId
    ? repository.retrieveWorkItemType(tenantId, issue.workItemTypeId)
    : repository.retrieveWorkItemTypeByKey(tenantId, issue.typeKey)
}

export async function setCustomFieldValue(
  organizationId: string,
  issueRef: string,
  input: CustomFieldValueInput & { updatedBy?: string | null }
): Promise<ServiceResult<SerializedCustomFieldValue | null>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const issue = await issues.resolveIssue(resolved.tenant.id, issueRef)
  if (!issue || issue.deletedAt !== null)
    return { data: null, error: getError('projects/issue-not-found') }
  const type = await resolveIssueWorkItemType(resolved.tenant.id, issue)
  if (!type)
    return { data: null, error: getError('projects/work-item-type-not-found') }
  const validation = await validateIssueCustomFieldValues(
    resolved.tenant.id,
    type.id,
    [input],
    issue.id
  )
  if (validation.error) return { data: null, error: validation.error }
  return setCustomFieldValueForTenant(
    resolved.tenant.id,
    issue.id,
    input,
    input.updatedBy
  )
}

export async function clearCustomFieldValue(
  organizationId: string,
  issueRef: string,
  fieldId: string
): Promise<
  ServiceResult<{
    object: 'projects.custom-field-value'
    id: string
    deleted: true
  }>
> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const issue = await issues.resolveIssue(resolved.tenant.id, issueRef)
  if (!issue || issue.deletedAt !== null)
    return { data: null, error: getError('projects/issue-not-found') }
  const type = await resolveIssueWorkItemType(resolved.tenant.id, issue)
  if (!type)
    return { data: null, error: getError('projects/work-item-type-not-found') }
  const validation = await validateIssueCustomFieldValues(
    resolved.tenant.id,
    type.id,
    [{ fieldId, value: null }],
    issue.id
  )
  if (validation.error) return { data: null, error: validation.error }
  await repository.clearCustomFieldValue(resolved.tenant.id, issue.id, fieldId)
  return {
    data: { object: 'projects.custom-field-value', id: fieldId, deleted: true },
    error: null,
  }
}

export async function seedPreset(
  tenantId: string,
  key: string
): Promise<ServiceResult<null>> {
  const preset = getWorkStructurePreset(key)
  if (!preset)
    return { data: null, error: getError('projects/preset-not-found') }
  await repository.seedPreset(tenantId, preset)
  return { data: null, error: null }
}

export function listPresets() {
  return workStructurePresets
}

export async function applyPreset(
  organizationId: string,
  key: string
): Promise<ServiceResult<null>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const result = await seedPreset(resolved.tenant.id, key)
  if (result.error) return result
  await tenants.setPresetKey(resolved.tenant.id, key)
  return { data: null, error: null }
}

export async function listVisibleMilestones(
  organizationId: string,
  projectIdOrKey: string,
  query: { limit?: number; starting_after?: string }
): Promise<ServiceResult<MilestoneRow[]>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const project = await resolveProject(resolved.tenant.id, projectIdOrKey)
  if (project.error) return { data: null, error: project.error }

  const limit = Math.min(Math.max(query.limit ?? 25, 1), 100)
  const rows = await repository.listVisibleMilestones(
    resolved.tenant.id,
    project.project.id,
    { limit, startingAfter: query.starting_after }
  )
  return { data: rows as MilestoneRow[], error: null }
}

export async function retrieveVisibleMilestone(
  organizationId: string,
  projectId: string,
  id: string
): Promise<ServiceResult<MilestoneRow>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const row = await repository.retrieveMilestone(resolved.tenant.id, id)
  if (
    !row ||
    row.projectId !== projectId ||
    !(row as MilestoneRow).clientVisible
  )
    return { data: null, error: getError('projects/milestone-not-found') }
  return { data: row as MilestoneRow, error: null }
}

export async function setMilestoneVisibility(
  organizationId: string,
  id: string,
  clientVisible: boolean
): Promise<
  ServiceResult<{ object: string; id: string; clientVisible: boolean }>
> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const existing = await repository.retrieveMilestone(resolved.tenant.id, id)
  if (!existing)
    return { data: null, error: getError('projects/milestone-not-found') }
  const updated = await repository.setMilestoneVisibility(
    existing.id,
    clientVisible,
    now()
  )
  return {
    data: {
      object: 'projects.milestone',
      id: updated.id,
      clientVisible: (updated as MilestoneRow).clientVisible,
    },
    error: null,
  }
}
