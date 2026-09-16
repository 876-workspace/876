import { getError, type ProjectsError } from '../../http/errors.js'
import { generateId } from '../../platform/ids.js'
import { nowUnixSeconds, toDbUnixSeconds } from '../../platform/timestamps.js'
import * as automation from '../automation/index.js'
import {
  buildCustomFieldValueData,
  customFieldOptionKeys,
  missingRequiredFieldKey,
  readCustomFieldValue,
  type CustomFieldValue,
} from '../custom-fields/index.js'
import * as layouts from '../layouts/index.js'
import * as projects from '../projects/index.js'
import { countBy, toCsv } from '../reports/index.js'
import * as tenants from '../tenants/index.js'
import * as repository from './custom-modules.repository.js'
import {
  serializeCustomModule,
  serializeCustomRecord,
  serializeDashboardWidget,
  serializeModuleField,
  serializeModuleLink,
  serializeModuleStatus,
  createdPerDay,
  type CustomModuleRecordValueRow,
  type SerializedCustomModule,
  type SerializedCustomModuleTombstone,
  type SerializedCustomRecord,
  type SerializedCustomRecordTombstone,
  type SerializedDashboardWidget,
  type SerializedDashboardWidgetTombstone,
  type SerializedModuleField,
  type SerializedModuleLink,
  type SerializedModuleLinkTombstone,
  type SerializedModuleStatus,
  type CreatedReport,
  type FieldReport,
  type StatusReport,
} from './custom-modules.serializers.js'
import type {
  CreateLinkBody,
  CreateModuleBody,
  CreateModuleFieldBody,
  CreateModuleStatusBody,
  CreateRecordBody,
  CreateWidgetBody,
  ListRecordsQuery,
  ListWidgetsQuery,
  ModuleReportQuery,
  ReorderStatusesBody,
  UpdateModuleBody,
  UpdateModuleFieldBody,
  UpdateModuleStatusBody,
  UpdateRecordBody,
  UpdateWidgetBody,
} from './custom-modules.schemas.js'

export type ServiceResult<T> = { data: T; error: null } | { data: null; error: ProjectsError }

export type PaginatedRecords = { items: SerializedCustomRecord[]; hasMore: boolean; totalCount: number | null }

/**
 * Interim authorization: the app passes the caller's effective app role keys
 * in the `x-app-role-keys` header (comma-separated). An empty
 * `restrictedToRoleKeys` list means the module is visible to every caller
 * that already holds `projects.view`/`projects.edit`; a non-empty list
 * requires at least one intersecting key and otherwise fails closed with
 * `projects/custom-module-forbidden`. A future change will resolve role keys
 * server-side from core app access grants instead of trusting the header.
 */
export function parseRoleKeysHeader(header: string | string[] | undefined): string[] {
  const raw = Array.isArray(header) ? header.join(',') : (header ?? '')
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
}

function hasModuleAccess(restrictedToRoleKeys: string[], callerRoleKeys: string[]): boolean {
  if (restrictedToRoleKeys.length === 0) return true
  const caller = new Set(callerRoleKeys)
  return restrictedToRoleKeys.some((key) => caller.has(key))
}

function now() {
  return toDbUnixSeconds(nowUnixSeconds())
}

async function resolveTenant(organizationId: string) {
  const tenant = await tenants.resolveTenant(organizationId)
  return tenant ? { tenant, error: null } : { tenant: null, error: getError('projects/tenant-not-found') }
}

async function resolveModule(tenantId: string, moduleId: string) {
  const definition = await repository.retrieveModule(tenantId, moduleId)
  return definition
    ? { module: definition, error: null }
    : { module: null, error: getError('projects/custom-module-not-found') }
}

async function resolveModuleByKey(tenantId: string, key: string) {
  const definition = await repository.retrieveModuleByKey(tenantId, key)
  return definition
    ? { module: definition, error: null }
    : { module: null, error: getError('projects/custom-module-not-found') }
}

function forbiddenIfRestricted(module: { restrictedToRoleKeys: string[] }, roleKeys: string[]): ProjectsError | null {
  if (!hasModuleAccess(module.restrictedToRoleKeys, roleKeys)) return getError('projects/custom-module-forbidden')
  return null
}

async function validateProjectScope(
  organizationId: string,
  tenantId: string,
  module: { scope: string; projectId: string | null },
  recordProjectId: string | null | undefined
): Promise<ProjectsError | null> {
  if (module.scope === 'project') {
    if (!recordProjectId && !module.projectId) return getError('projects/invalid-request')
    const effective = recordProjectId ?? module.projectId
    if (module.projectId && effective !== module.projectId) return getError('projects/invalid-request')
    if (effective) {
      const project = await projects.resolveProject(tenantId, effective)
      void organizationId
      if (!project) return getError('projects/project-not-found')
    }
    return null
  }
  if (recordProjectId) {
    const project = await projects.resolveProject(tenantId, recordProjectId)
    if (!project) return getError('projects/project-not-found')
  }
  return null
}

function toFieldDefinition(field: { fieldType: string; options: unknown }) {
  return { fieldType: field.fieldType, options: field.options }
}

function layoutEntityFor(moduleKey: string): layouts.LayoutEntity {
  return `custom-module:${moduleKey}`
}

function recordLayoutValues(input: {
  title?: string | null
  statusKey?: string | null
  fields?: Record<string, CustomFieldValue>
}): Record<string, unknown> {
  const values: Record<string, unknown> = {}
  if (input.title !== undefined) values.title = input.title
  if (input.statusKey !== undefined) values.state = input.statusKey
  if (input.fields) for (const [key, value] of Object.entries(input.fields)) values[`cf:${key}`] = value
  return values
}

export async function listModules(organizationId: string): Promise<ServiceResult<SerializedCustomModule[]>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const rows = await repository.listModules(resolved.tenant.id)
  return { data: rows.map((row) => serializeCustomModule(row as never)), error: null }
}

export async function createModule(
  organizationId: string,
  body: CreateModuleBody
): Promise<ServiceResult<SerializedCustomModule>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  if (await repository.retrieveModuleByKey(resolved.tenant.id, body.key))
    return { data: null, error: getError('projects/custom-module-key-taken') }
  if (body.scope === 'project' && body.projectId) {
    const project = await projects.resolveProject(resolved.tenant.id, body.projectId)
    if (!project) return { data: null, error: getError('projects/project-not-found') }
  }
  const timestamp = now()
  const row = await repository.createModule({
    id: generateId('customModule'),
    tenantId: resolved.tenant.id,
    scope: body.scope,
    projectId: body.projectId ?? null,
    key: body.key,
    singularName: body.singularName,
    pluralName: body.pluralName,
    icon: body.icon ?? null,
    version: 1,
    restrictedToRoleKeys: body.restrictedToRoleKeys ?? [],
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  return { data: serializeCustomModule(row as never), error: null }
}

export async function retrieveModule(
  organizationId: string,
  moduleId: string
): Promise<ServiceResult<SerializedCustomModule>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const found = await resolveModule(resolved.tenant.id, moduleId)
  if (found.error) return { data: null, error: found.error }
  return { data: serializeCustomModule(found.module as never), error: null }
}

export async function updateModule(
  organizationId: string,
  moduleId: string,
  body: UpdateModuleBody
): Promise<ServiceResult<SerializedCustomModule>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const found = await resolveModule(resolved.tenant.id, moduleId)
  if (found.error) return { data: null, error: found.error }
  if (body.key !== undefined && body.key !== found.module.key)
    return { data: null, error: getError('projects/custom-module-key-immutable') }
  const nextScope = body.scope ?? found.module.scope
  const nextProjectId = body.projectId !== undefined ? body.projectId : found.module.projectId
  if (nextScope === 'project' && !nextProjectId) return { data: null, error: getError('projects/invalid-request') }
  if (nextScope === 'org' && nextProjectId) return { data: null, error: getError('projects/invalid-request') }
  if (nextProjectId) {
    const project = await projects.resolveProject(resolved.tenant.id, nextProjectId)
    if (!project) return { data: null, error: getError('projects/project-not-found') }
  }
  const row = await repository.updateModule(found.module.id, {
    ...(body.scope !== undefined ? { scope: body.scope } : {}),
    ...(body.projectId !== undefined ? { projectId: body.projectId } : {}),
    ...(body.singularName !== undefined ? { singularName: body.singularName } : {}),
    ...(body.pluralName !== undefined ? { pluralName: body.pluralName } : {}),
    ...(body.icon !== undefined ? { icon: body.icon } : {}),
    ...(body.restrictedToRoleKeys !== undefined && body.restrictedToRoleKeys !== null
      ? { restrictedToRoleKeys: body.restrictedToRoleKeys }
      : {}),
    ...(body.restrictedToRoleKeys === null ? { restrictedToRoleKeys: [] } : {}),
    version: { increment: 1 },
    updatedAt: now(),
  })
  return { data: serializeCustomModule(row as never), error: null }
}

export async function removeModule(
  organizationId: string,
  moduleId: string
): Promise<ServiceResult<SerializedCustomModuleTombstone>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const found = await resolveModule(resolved.tenant.id, moduleId)
  if (found.error) return { data: null, error: found.error }
  await repository.updateModule(found.module.id, { deletedAt: now(), updatedAt: now() })
  return { data: { object: 'projects.custom-module', id: moduleId, deleted: true }, error: null }
}

export async function listModuleFields(
  organizationId: string,
  moduleIdOrKey: string
): Promise<ServiceResult<SerializedModuleField[]>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const found = moduleIdOrKey.startsWith('cmod_')
    ? await resolveModule(resolved.tenant.id, moduleIdOrKey)
    : await resolveModuleByKey(resolved.tenant.id, moduleIdOrKey)
  if (found.error) return { data: null, error: found.error }
  const rows = await repository.listModuleFields(found.module.id)
  return { data: rows.map((row) => serializeModuleField(row as never)), error: null }
}

export async function createModuleField(
  organizationId: string,
  moduleId: string,
  body: CreateModuleFieldBody
): Promise<ServiceResult<SerializedModuleField>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const found = await resolveModule(resolved.tenant.id, moduleId)
  if (found.error) return { data: null, error: found.error }
  if (await repository.retrieveModuleFieldByKey(found.module.id, body.key))
    return { data: null, error: getError('projects/custom-module-field-key-taken') }
  if ((body.fieldType === 'select' || body.fieldType === 'multi-select') && customFieldOptionKeys(body.options).length === 0)
    return { data: null, error: getError('projects/invalid-request') }
  if (body.fieldType !== 'select' && body.fieldType !== 'multi-select' && body.options !== undefined)
    return { data: null, error: getError('projects/invalid-request') }
  const timestamp = now()
  const row = await repository.createModuleField({
    id: generateId('customModuleField'),
    tenantId: resolved.tenant.id,
    moduleId: found.module.id,
    key: body.key,
    label: body.label,
    fieldType: body.fieldType,
    options: body.options ?? undefined,
    required: body.required ?? false,
    position: body.position ?? 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  return { data: serializeModuleField(row as never), error: null }
}

export async function updateModuleField(
  organizationId: string,
  moduleId: string,
  fieldId: string,
  body: UpdateModuleFieldBody
): Promise<ServiceResult<SerializedModuleField>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const found = await resolveModule(resolved.tenant.id, moduleId)
  if (found.error) return { data: null, error: found.error }
  const existing = await repository.retrieveModuleField(found.module.id, fieldId)
  if (!existing) return { data: null, error: getError('projects/custom-module-field-not-found') }
  const nextType = body.fieldType ?? existing.fieldType
  const nextOptions = body.options ?? (existing.options as Array<{ key: string; label: string }> | undefined)
  if ((nextType === 'select' || nextType === 'multi-select') && customFieldOptionKeys(nextOptions).length === 0)
    return { data: null, error: getError('projects/invalid-request') }
  if (nextType !== 'select' && nextType !== 'multi-select' && body.options !== undefined)
    return { data: null, error: getError('projects/invalid-request') }
  const row = await repository.updateModuleField(existing.id, {
    ...(body.label !== undefined ? { label: body.label } : {}),
    ...(body.fieldType !== undefined ? { fieldType: body.fieldType } : {}),
    ...(body.options !== undefined ? { options: body.options } : {}),
    ...(body.required !== undefined ? { required: body.required } : {}),
    ...(body.position !== undefined ? { position: body.position } : {}),
    updatedAt: now(),
  })
  return { data: serializeModuleField(row as never), error: null }
}

export async function removeModuleField(
  organizationId: string,
  moduleId: string,
  fieldId: string
): Promise<ServiceResult<{ object: 'projects.custom-module-field'; id: string; deleted: true }>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const found = await resolveModule(resolved.tenant.id, moduleId)
  if (found.error) return { data: null, error: found.error }
  const existing = await repository.retrieveModuleField(found.module.id, fieldId)
  if (!existing) return { data: null, error: getError('projects/custom-module-field-not-found') }
  await repository.deleteModuleField(existing.id)
  return { data: { object: 'projects.custom-module-field', id: fieldId, deleted: true }, error: null }
}

export async function listModuleStatuses(
  organizationId: string,
  moduleId: string
): Promise<ServiceResult<SerializedModuleStatus[]>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const found = await resolveModule(resolved.tenant.id, moduleId)
  if (found.error) return { data: null, error: found.error }
  const rows = await repository.listModuleStatuses(found.module.id)
  return { data: rows.map((row) => serializeModuleStatus(row as never)), error: null }
}

export async function createModuleStatus(
  organizationId: string,
  moduleId: string,
  body: CreateModuleStatusBody
): Promise<ServiceResult<SerializedModuleStatus>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const found = await resolveModule(resolved.tenant.id, moduleId)
  if (found.error) return { data: null, error: found.error }
  if (await repository.retrieveModuleStatusByKey(found.module.id, body.key))
    return { data: null, error: getError('projects/custom-module-status-key-taken') }
  if (body.isDefault && body.category !== 'open')
    return { data: null, error: getError('projects/default-custom-module-status-required') }
  const existing = await repository.listModuleStatuses(found.module.id)
  const timestamp = now()
  const position = body.position ?? existing.length
  const row = await repository.createModuleStatus({
    id: generateId('customModuleStatus'),
    tenantId: resolved.tenant.id,
    moduleId: found.module.id,
    key: body.key,
    label: body.label,
    category: body.category,
    position,
    isDefault: body.isDefault ?? existing.length === 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  if (row.isDefault) {
    for (const other of existing.filter((status) => status.isDefault)) {
      await repository.updateModuleStatus(other.id, { isDefault: false, updatedAt: timestamp })
    }
  }
  const refreshed = await repository.retrieveModuleStatus(found.module.id, row.id)
  return { data: serializeModuleStatus((refreshed ?? row) as never), error: null }
}

export async function updateModuleStatus(
  organizationId: string,
  moduleId: string,
  statusId: string,
  body: UpdateModuleStatusBody
): Promise<ServiceResult<SerializedModuleStatus>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const found = await resolveModule(resolved.tenant.id, moduleId)
  if (found.error) return { data: null, error: found.error }
  const existing = await repository.retrieveModuleStatus(found.module.id, statusId)
  if (!existing) return { data: null, error: getError('projects/custom-module-status-not-found') }
  const nextCategory = body.category ?? existing.category
  const nextDefault = body.isDefault ?? existing.isDefault
  if (nextDefault && nextCategory !== 'open')
    return { data: null, error: getError('projects/default-custom-module-status-required') }
  const timestamp = now()
  if (body.isDefault === true) {
    const siblings = await repository.listModuleStatuses(found.module.id)
    for (const sibling of siblings.filter((status) => status.id !== existing.id && status.isDefault)) {
      await repository.updateModuleStatus(sibling.id, { isDefault: false, updatedAt: timestamp })
    }
  }
  if (body.isDefault === false) {
    const siblings = await repository.listModuleStatuses(found.module.id)
    const otherDefault = siblings.some((status) => status.id !== existing.id && status.isDefault)
    if (!otherDefault) return { data: null, error: getError('projects/default-custom-module-status-required') }
  }
  const row = await repository.updateModuleStatus(existing.id, {
    ...(body.label !== undefined ? { label: body.label } : {}),
    ...(body.category !== undefined ? { category: body.category } : {}),
    ...(body.position !== undefined ? { position: body.position } : {}),
    ...(body.isDefault !== undefined ? { isDefault: body.isDefault } : {}),
    updatedAt: timestamp,
  })
  return { data: serializeModuleStatus(row as never), error: null }
}

export async function reorderModuleStatuses(
  organizationId: string,
  moduleId: string,
  body: ReorderStatusesBody
): Promise<ServiceResult<SerializedModuleStatus[]>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const found = await resolveModule(resolved.tenant.id, moduleId)
  if (found.error) return { data: null, error: found.error }
  const existing = await repository.listModuleStatuses(found.module.id)
  const existingIds = new Set(existing.map((status) => status.id))
  if (body.orderedIds.length !== existing.length || !body.orderedIds.every((id) => existingIds.has(id)))
    return { data: null, error: getError('projects/invalid-request') }
  if (new Set(body.orderedIds).size !== body.orderedIds.length)
    return { data: null, error: getError('projects/invalid-request') }
  await repository.updateManyModuleStatuses(
    found.module.id,
    body.orderedIds.map((id, position) => ({ id, position }))
  )
  const rows = await repository.listModuleStatuses(found.module.id)
  return { data: rows.map((row) => serializeModuleStatus(row as never)), error: null }
}

export async function removeModuleStatus(
  organizationId: string,
  moduleId: string,
  statusId: string
): Promise<ServiceResult<{ object: 'projects.custom-module-status'; id: string; deleted: true }>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const found = await resolveModule(resolved.tenant.id, moduleId)
  if (found.error) return { data: null, error: found.error }
  const existing = await repository.retrieveModuleStatus(found.module.id, statusId)
  if (!existing) return { data: null, error: getError('projects/custom-module-status-not-found') }
  if (existing.isDefault) return { data: null, error: getError('projects/default-custom-module-status-required') }
  const inUse = await repository.countRecordsByStatus(found.module.id, existing.key)
  if (inUse > 0) return { data: null, error: getError('projects/custom-module-status-in-use') }
  await repository.deleteModuleStatus(existing.id)
  return { data: { object: 'projects.custom-module-status', id: statusId, deleted: true }, error: null }
}

type ModuleValueColumns = {
  stringValue: string | null
  integerValue: number | null
  decimalValue: string | null
  booleanValue: boolean | null
  dateValue: bigint | null
  selectKey: string | null
  selectKeys: string[]
  updatedBy: string | null
}

type ModuleValueWrite =
  | { fieldId: string; clear: true }
  | { fieldId: string; clear?: false; columns: ModuleValueColumns }

async function buildValueWrites(
  fields: Array<{ id: string; key: string; fieldType: string; options: unknown }>,
  inputs: Array<{ key: string; value: string | number | boolean | string[] | null }>,
  actorUserId: string | null
): Promise<{ writes: ModuleValueWrite[]; error: null } | { writes: null; error: ProjectsError }> {
  const byKey = new Map(fields.map((field) => [field.key, field]))
  const writes: ModuleValueWrite[] = []
  for (const input of inputs) {
    const field = byKey.get(input.key)
    if (!field) return { writes: null, error: getError('projects/invalid-request') }
    const built = buildCustomFieldValueData(toFieldDefinition(field), input.value as CustomFieldValue)
    if (built.error) return { writes: null, error: built.error }
    if (built.data === null) {
      writes.push({ fieldId: field.id, clear: true })
      continue
    }
    writes.push({
      fieldId: field.id,
      columns: {
        stringValue: built.data.stringValue,
        integerValue: built.data.integerValue,
        decimalValue: built.data.decimalValue,
        booleanValue: built.data.booleanValue,
        dateValue: built.data.dateValue,
        selectKey: built.data.selectKey,
        selectKeys: built.data.selectKeys,
        updatedBy: actorUserId,
      },
    })
  }
  return { writes, error: null }
}

export async function listRecords(
  organizationId: string,
  moduleId: string,
  query: ListRecordsQuery,
  roleKeys: string[] = []
): Promise<ServiceResult<PaginatedRecords>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const found = await resolveModule(resolved.tenant.id, moduleId)
  if (found.error) return { data: null, error: found.error }
  const forbidden = forbiddenIfRestricted(found.module as never as { restrictedToRoleKeys: string[] }, roleKeys)
  if (forbidden) return { data: null, error: forbidden }
  const limit = Math.min(Math.max(query.limit ?? 25, 1), 100)
  const rows = await repository.listRecords(resolved.tenant.id, {
    moduleId: found.module.id,
    status: query.status,
    projectId: query.projectId,
    q: query.q,
    limit,
    startingAfter: query.startingAfter,
    endingBefore: query.endingBefore,
  })
  const hasMore = rows.length > limit
  const paged = hasMore ? rows.slice(0, limit) : rows
  let filtered = paged
  if (query.fieldKey && query.fieldValue !== undefined) {
    const field = await repository.retrieveModuleFieldByKey(found.module.id, query.fieldKey)
    if (!field) return { data: { items: [], hasMore: false, totalCount: 0 }, error: null }
    const values = await repository.listRecordValues(filtered.map((row) => row.id))
    const matching = new Set(
      values
        .filter((value) => {
          if (value.fieldId !== field.id) return false
          const api = readCustomFieldValue({
            stringValue: value.stringValue,
            integerValue: value.integerValue,
            decimalValue: value.decimalValue,
            booleanValue: value.booleanValue,
            dateValue: value.dateValue,
            selectKey: value.selectKey,
            selectKeys: value.selectKeys,
            field: { fieldType: (value.field as { fieldType: string } | null)?.fieldType ?? 'text' },
          })
          if (Array.isArray(api)) return api.includes(query.fieldValue as string)
          if (api === null) return false
          return String(api) === query.fieldValue
        })
        .map((value) => value.recordId)
    )
    filtered = filtered.filter((row) => matching.has(row.id))
  }
  const totalCount = await repository.countRecords(resolved.tenant.id, {
    moduleId: found.module.id,
    status: query.status,
    projectId: query.projectId,
    q: query.q,
  })
  const values = await repository.listRecordValues(filtered.map((row) => row.id))
  const byRecord = new Map<string, CustomModuleRecordValueRow[]>()
  for (const value of values) {
    const list = byRecord.get(value.recordId) ?? []
    list.push(value as unknown as CustomModuleRecordValueRow)
    byRecord.set(value.recordId, list)
  }
  return {
    data: {
      items: filtered.map((row) =>
        serializeCustomRecord(row as never, found.module.key, byRecord.get(row.id) ?? [])
      ),
      hasMore,
      totalCount,
    },
    error: null,
  }
}

export async function createRecord(
  organizationId: string,
  moduleId: string,
  body: CreateRecordBody,
  roleKeys: string[] = [],
  context?: { causationDepth?: number }
): Promise<ServiceResult<SerializedCustomRecord>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const found = await resolveModule(resolved.tenant.id, moduleId)
  if (found.error) return { data: null, error: found.error }
  const forbidden = forbiddenIfRestricted(found.module as never as { restrictedToRoleKeys: string[] }, roleKeys)
  if (forbidden) return { data: null, error: forbidden }
  const scopeError = await validateProjectScope(
    organizationId,
    resolved.tenant.id,
    found.module as never as { scope: string; projectId: string | null },
    body.projectId ?? null
  )
  if (scopeError) return { data: null, error: scopeError }
  const statuses = await repository.listModuleStatuses(found.module.id)
  if (statuses.length === 0) return { data: null, error: getError('projects/default-custom-module-status-required') }
  const defaultStatus = statuses.find((status) => status.isDefault) ?? statuses[0]
  const statusKey = body.statusKey ?? (defaultStatus?.key as string)
  const status = statuses.find((entry) => entry.key === statusKey)
  if (!status) return { data: null, error: getError('projects/custom-module-status-not-found') }
  const fields = await repository.listModuleFields(found.module.id)
  const fieldInputs = body.fields ?? []
  const unknownField = fieldInputs.find((input) => !fields.some((field) => field.key === input.key))
  if (unknownField) return { data: null, error: getError('projects/invalid-request') }
  const missing = missingRequiredFieldKey(
    fields.map((field) => ({ id: field.id, key: field.key, required: field.required })),
    fieldInputs.map((input) => ({ fieldId: fields.find((field) => field.key === input.key)?.id as string, value: input.value as CustomFieldValue })),
    new Set()
  )
  if (missing) return { data: null, error: getError('projects/required-custom-field-missing') }
  const timestamp = now()
  const built = await buildValueWrites(
    fields as never as Array<{ id: string; key: string; fieldType: string; options: unknown }>,
    fieldInputs,
    body.createdBy ?? null
  )
  if (built.error) return { data: null, error: built.error }
  const fieldMap: Record<string, CustomFieldValue> = {}
  for (const input of fieldInputs) fieldMap[input.key] = input.value as CustomFieldValue
  const layoutCheck = await layouts.enforceLayoutRules({
    organizationId,
    entity: layoutEntityFor(found.module.key),
    existing: {},
    incoming: recordLayoutValues({ title: body.title, statusKey, fields: fieldMap }),
  })
  if (layoutCheck.error) return { data: null, error: layoutCheck.error }
  const recordId = generateId('customModuleRecord')
  const effectiveProjectId =
    body.projectId ?? (found.module.projectId as string | null) ?? null
  try {
    const created = await repository.transaction(async (client) => {
      const record = await client.customModuleRecord.create({
        data: {
          id: recordId,
          tenantId: resolved.tenant.id,
          moduleId: found.module.id,
          projectId: effectiveProjectId,
          title: body.title,
          statusKey,
          createdBy: body.createdBy ?? null,
          updatedBy: body.createdBy ?? null,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      })
      for (const write of built.writes ?? []) {
        if (write.clear) continue
        await client.customModuleRecordValue.create({
          data: {
            id: generateId('customModuleRecordValue'),
            tenantId: resolved.tenant.id,
            recordId,
            fieldId: write.fieldId,
            ...write.columns,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        })
      }
      await automation.appendOutboxEvent(client as never, {
        tenantId: resolved.tenant.id,
        type: 'custom-record.created',
        subjectType: 'custom-record',
        subjectId: recordId,
        payload: { organizationId, moduleKey: found.module.key, projectId: effectiveProjectId, statusKey },
        causationDepth: context?.causationDepth ?? 0,
      })
      return record
    })
    const values = await repository.listRecordValues([recordId])
    return {
      data: serializeCustomRecord(created as never, found.module.key, values as unknown as CustomModuleRecordValueRow[]),
      error: null,
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('layout')) throw error
    return { data: null, error: getError('projects/internal-error') }
  }
}

export async function retrieveRecord(
  organizationId: string,
  moduleId: string,
  recordId: string,
  roleKeys: string[] = []
): Promise<ServiceResult<SerializedCustomRecord>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const found = await resolveModule(resolved.tenant.id, moduleId)
  if (found.error) return { data: null, error: found.error }
  const forbidden = forbiddenIfRestricted(found.module as never as { restrictedToRoleKeys: string[] }, roleKeys)
  if (forbidden) return { data: null, error: forbidden }
  const row = await repository.retrieveRecord(resolved.tenant.id, found.module.id, recordId)
  if (!row) return { data: null, error: getError('projects/custom-module-record-not-found') }
  const values = await repository.listRecordValues([row.id])
  return {
    data: serializeCustomRecord(row as never, found.module.key, values as unknown as CustomModuleRecordValueRow[]),
    error: null,
  }
}

export async function updateRecord(
  organizationId: string,
  moduleId: string,
  recordId: string,
  body: UpdateRecordBody,
  roleKeys: string[] = [],
  context?: { causationDepth?: number }
): Promise<ServiceResult<SerializedCustomRecord>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const found = await resolveModule(resolved.tenant.id, moduleId)
  if (found.error) return { data: null, error: found.error }
  const forbidden = forbiddenIfRestricted(found.module as never as { restrictedToRoleKeys: string[] }, roleKeys)
  if (forbidden) return { data: null, error: forbidden }
  const existing = await repository.retrieveRecord(resolved.tenant.id, found.module.id, recordId)
  if (!existing) return { data: null, error: getError('projects/custom-module-record-not-found') }
  if (body.projectId !== undefined) {
    const scopeError = await validateProjectScope(
      organizationId,
      resolved.tenant.id,
      found.module as never as { scope: string; projectId: string | null },
      body.projectId
    )
    if (scopeError) return { data: null, error: scopeError }
  }
  const statuses = await repository.listModuleStatuses(found.module.id)
  if (body.statusKey !== undefined && !statuses.some((status) => status.key === body.statusKey))
    return { data: null, error: getError('projects/custom-module-status-not-found') }
  const fields = await repository.listModuleFields(found.module.id)
  const storedValues = await repository.listRecordValues([existing.id])
  const storedIds = new Set(storedValues.filter((value) => {
    const api = readCustomFieldValue({
      stringValue: value.stringValue,
      integerValue: value.integerValue,
      decimalValue: value.decimalValue,
      booleanValue: value.booleanValue,
      dateValue: value.dateValue,
      selectKey: value.selectKey,
      selectKeys: value.selectKeys,
      field: { fieldType: (value.field as { fieldType: string } | null)?.fieldType ?? 'text' },
    })
    return api !== null && !(Array.isArray(api) && api.length === 0) && api !== ''
  }).map((value) => value.fieldId))
  if (body.fields !== undefined) {
    const unknownField = body.fields.find((input) => !fields.some((field) => field.key === input.key))
    if (unknownField) return { data: null, error: getError('projects/invalid-request') }
    const missing = missingRequiredFieldKey(
      fields.map((field) => ({ id: field.id, key: field.key, required: field.required })),
      body.fields.map((input) => ({ fieldId: fields.find((field) => field.key === input.key)?.id as string, value: input.value as CustomFieldValue })),
      storedIds
    )
    if (missing) return { data: null, error: getError('projects/required-custom-field-missing') }
  }
  const timestamp = now()
  const built = body.fields
    ? await buildValueWrites(
        fields as never as Array<{ id: string; key: string; fieldType: string; options: unknown }>,
        body.fields,
        body.updatedBy ?? null
      )
    : { writes: [], error: null }
  if (built.error) return { data: null, error: built.error }
  const existingFieldMap: Record<string, CustomFieldValue> = {}
  for (const value of storedValues) {
    const key = (value.field as { key: string } | null)?.key
    if (!key) continue
    existingFieldMap[key] = readCustomFieldValue({
      stringValue: value.stringValue,
      integerValue: value.integerValue,
      decimalValue: value.decimalValue,
      booleanValue: value.booleanValue,
      dateValue: value.dateValue,
      selectKey: value.selectKey,
      selectKeys: value.selectKeys,
      field: { fieldType: (value.field as { fieldType: string } | null)?.fieldType ?? 'text' },
    }) as CustomFieldValue
  }
  const incomingFieldMap: Record<string, CustomFieldValue> = {}
  for (const input of body.fields ?? []) incomingFieldMap[input.key] = input.value as CustomFieldValue
  const layoutCheck = await layouts.enforceLayoutRules({
    organizationId,
    entity: layoutEntityFor(found.module.key),
    existing: recordLayoutValues({ title: existing.title, statusKey: existing.statusKey, fields: existingFieldMap }),
    incoming: recordLayoutValues({
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.statusKey !== undefined ? { statusKey: body.statusKey } : {}),
      ...(body.fields !== undefined ? { fields: incomingFieldMap } : {}),
    }),
  })
  if (layoutCheck.error) return { data: null, error: layoutCheck.error }
  const statusChanged = body.statusKey !== undefined && body.statusKey !== existing.statusKey
  const updated = await repository.transaction(async (client) => {
    const record = await client.customModuleRecord.update({
      where: { id: existing.id },
      data: {
        ...(body.projectId !== undefined ? { projectId: body.projectId } : {}),
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.statusKey !== undefined ? { statusKey: body.statusKey } : {}),
        ...(body.updatedBy !== undefined ? { updatedBy: body.updatedBy } : {}),
        updatedAt: timestamp,
      },
    })
    for (const write of built.writes ?? []) {
      if (write.clear) {
        await client.customModuleRecordValue.deleteMany({ where: { recordId: existing.id, fieldId: write.fieldId } })
        continue
      }
      const rest = write.columns
      await client.customModuleRecordValue.upsert({
        where: { projects_cmodrv_record_field_uidx: { recordId: existing.id, fieldId: write.fieldId } } as never,
        create: {
          id: generateId('customModuleRecordValue'),
          tenantId: resolved.tenant.id,
          recordId: existing.id,
          fieldId: write.fieldId,
          ...(rest as Record<string, string | number | boolean | bigint | string[] | null>),
          createdAt: timestamp,
          updatedAt: timestamp,
        } as never,
        update: { ...rest, updatedAt: timestamp } as never,
      })
    }
    await automation.appendOutboxEvent(client as never, {
      tenantId: resolved.tenant.id,
      type: 'custom-record.updated',
      subjectType: 'custom-record',
      subjectId: existing.id,
      payload: { organizationId, moduleKey: found.module.key, updatedFields: Object.keys(body) },
      causationDepth: context?.causationDepth ?? 0,
    })
    if (statusChanged) {
      await automation.appendOutboxEvent(client as never, {
        tenantId: resolved.tenant.id,
        type: 'custom-record.status-changed',
        subjectType: 'custom-record',
        subjectId: existing.id,
        payload: {
          organizationId,
          moduleKey: found.module.key,
          fromStatus: existing.statusKey,
          toStatus: body.statusKey,
        },
        causationDepth: context?.causationDepth ?? 0,
      })
    }
    return record
  })
  const values = await repository.listRecordValues([existing.id])
  return {
    data: serializeCustomRecord(updated as never, found.module.key, values as unknown as CustomModuleRecordValueRow[]),
    error: null,
  }
}

export async function removeRecord(
  organizationId: string,
  moduleId: string,
  recordId: string,
  roleKeys: string[] = []
): Promise<ServiceResult<SerializedCustomRecordTombstone>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const found = await resolveModule(resolved.tenant.id, moduleId)
  if (found.error) return { data: null, error: found.error }
  const forbidden = forbiddenIfRestricted(found.module as never as { restrictedToRoleKeys: string[] }, roleKeys)
  if (forbidden) return { data: null, error: forbidden }
  const existing = await repository.retrieveRecord(resolved.tenant.id, found.module.id, recordId)
  if (!existing) return { data: null, error: getError('projects/custom-module-record-not-found') }
  await repository.transaction(async (client) => {
    await client.customModuleRecord.update({
      where: { id: existing.id },
      data: { deletedAt: now(), updatedAt: now() },
    })
    await automation.appendOutboxEvent(client as never, {
      tenantId: resolved.tenant.id,
      type: 'custom-record.updated',
      subjectType: 'custom-record',
      subjectId: existing.id,
      payload: { organizationId, moduleKey: found.module.key, deleted: true },
      causationDepth: 0,
    })
  })
  return { data: { object: 'projects.custom-record', id: recordId, deleted: true }, error: null }
}

export async function retrieveRecordForAutomation(organizationId: string, recordId: string) {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const row = await repository.retrieveRecordById(resolved.tenant.id, recordId)
  if (!row) return { data: null, error: getError('projects/automation-subject-not-found') }
  const definition = await repository.retrieveModule(resolved.tenant.id, row.moduleId)
  if (!definition) return { data: null, error: getError('projects/automation-subject-not-found') }
  const values = await repository.listRecordValues([row.id])
  const serialized = serializeCustomRecord(row as never, definition.key, values as unknown as CustomModuleRecordValueRow[])
  return { data: serialized, error: null }
}

export async function updateRecordFromAutomation(
  organizationId: string,
  recordId: string,
  patch: { title?: string | null; statusKey?: string; fields?: Array<{ key: string; value: string | number | boolean | string[] | null }> },
  context: { automationRuleId: string; causationDepth: number }
) {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const row = await repository.retrieveRecordById(resolved.tenant.id, recordId)
  if (!row) return { data: null, error: getError('projects/automation-subject-not-found') }
  const definition = await repository.retrieveModule(resolved.tenant.id, row.moduleId)
  if (!definition) return { data: null, error: getError('projects/automation-subject-not-found') }
  const body: UpdateRecordBody = {
    ...(patch.title !== undefined && patch.title !== null ? { title: patch.title } : {}),
    ...(patch.statusKey !== undefined ? { statusKey: patch.statusKey } : {}),
    ...(patch.fields !== undefined ? { fields: patch.fields } : {}),
    updatedBy: `automation:${context.automationRuleId}`,
  }
  return updateRecord(organizationId, definition.id, row.id, body, [], { causationDepth: context.causationDepth + 1 })
}

export async function listLinks(
  organizationId: string,
  moduleId: string,
  recordId: string,
  roleKeys: string[] = []
): Promise<ServiceResult<SerializedModuleLink[]>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const found = await resolveModule(resolved.tenant.id, moduleId)
  if (found.error) return { data: null, error: found.error }
  const forbidden = forbiddenIfRestricted(found.module as never as { restrictedToRoleKeys: string[] }, roleKeys)
  if (forbidden) return { data: null, error: forbidden }
  const record = await repository.retrieveRecord(resolved.tenant.id, found.module.id, recordId)
  if (!record) return { data: null, error: getError('projects/custom-module-record-not-found') }
  const rows = await repository.listLinksForSource(record.id)
  return { data: rows.map((row) => serializeModuleLink(row as never)), error: null }
}

export async function createLink(
  organizationId: string,
  moduleId: string,
  recordId: string,
  body: CreateLinkBody,
  roleKeys: string[] = []
): Promise<ServiceResult<SerializedModuleLink>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const found = await resolveModule(resolved.tenant.id, moduleId)
  if (found.error) return { data: null, error: found.error }
  const forbidden = forbiddenIfRestricted(found.module as never as { restrictedToRoleKeys: string[] }, roleKeys)
  if (forbidden) return { data: null, error: forbidden }
  const record = await repository.retrieveRecord(resolved.tenant.id, found.module.id, recordId)
  if (!record) return { data: null, error: getError('projects/custom-module-record-not-found') }
  if (body.targetType === 'record') {
    if (body.targetId === record.id) return { data: null, error: getError('projects/custom-module-link-invalid') }
    const target = await repository.retrieveRecordById(resolved.tenant.id, body.targetId)
    if (!target) return { data: null, error: getError('projects/custom-module-link-invalid') }
  }
  if (await repository.findLink(record.id, body.targetType, body.targetId, body.relation))
    return { data: null, error: getError('projects/custom-module-link-exists') }
  const timestamp = now()
  const created = await repository.transaction(async (client) => {
    return client.customModuleLink.create({
      data: {
        id: generateId('customModuleLink'),
        tenantId: resolved.tenant.id,
        sourceRecordId: record.id,
        targetType: body.targetType,
        targetId: body.targetId,
        relation: body.relation,
        createdBy: body.createdBy ?? null,
        createdAt: timestamp,
      },
    })
  })
  return { data: serializeModuleLink(created as never), error: null }
}

export async function removeLink(
  organizationId: string,
  moduleId: string,
  recordId: string,
  linkId: string,
  roleKeys: string[] = []
): Promise<ServiceResult<SerializedModuleLinkTombstone>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const found = await resolveModule(resolved.tenant.id, moduleId)
  if (found.error) return { data: null, error: found.error }
  const forbidden = forbiddenIfRestricted(found.module as never as { restrictedToRoleKeys: string[] }, roleKeys)
  if (forbidden) return { data: null, error: forbidden }
  const record = await repository.retrieveRecord(resolved.tenant.id, found.module.id, recordId)
  if (!record) return { data: null, error: getError('projects/custom-module-record-not-found') }
  const existing = await repository.retrieveLink(record.id, linkId)
  if (!existing) return { data: null, error: getError('projects/custom-module-link-not-found') }
  await repository.transaction(async (client) => {
    await client.customModuleLink.delete({ where: { id: existing.id } })
  })
  return { data: { object: 'projects.custom-module-link', id: linkId, deleted: true }, error: null }
}

export async function getStatusReport(
  organizationId: string,
  moduleId: string,
  query: ModuleReportQuery,
  roleKeys: string[] = []
): Promise<ServiceResult<{ report: StatusReport; csv: string }>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const found = await resolveModule(resolved.tenant.id, moduleId)
  if (found.error) return { data: null, error: found.error }
  const forbidden = forbiddenIfRestricted(found.module as never as { restrictedToRoleKeys: string[] }, roleKeys)
  if (forbidden) return { data: null, error: forbidden }
  const rows = await repository.listRecordsForReport(resolved.tenant.id, found.module.id)
  const statuses = await repository.listModuleStatuses(found.module.id)
  const labels = new Map(statuses.map((status) => [status.key, status.label]))
  const byStatus = countBy(
    rows.map((row) => row.statusKey),
    labels
  )
  const report: StatusReport = {
    object: 'projects.custom-module-status-report',
    moduleId: found.module.id,
    moduleKey: found.module.key,
    total: rows.length,
    byStatus,
  }
  void query
  const csv = toCsv(
    ['status', 'label', 'count'],
    byStatus.map((row) => [row.key, row.label, row.count])
  )
  return { data: { report, csv }, error: null }
}

export async function getFieldReport(
  organizationId: string,
  moduleId: string,
  query: ModuleReportQuery,
  roleKeys: string[] = []
): Promise<ServiceResult<{ report: FieldReport; csv: string }>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const found = await resolveModule(resolved.tenant.id, moduleId)
  if (found.error) return { data: null, error: found.error }
  const forbidden = forbiddenIfRestricted(found.module as never as { restrictedToRoleKeys: string[] }, roleKeys)
  if (forbidden) return { data: null, error: forbidden }
  if (!query.fieldKey) return { data: null, error: getError('projects/invalid-request') }
  const field = await repository.retrieveModuleFieldByKey(found.module.id, query.fieldKey)
  if (!field) return { data: null, error: getError('projects/custom-module-field-not-found') }
  if (field.fieldType !== 'select' && field.fieldType !== 'multi-select')
    return { data: null, error: getError('projects/invalid-request') }
  const rows = await repository.listRecordsForReport(resolved.tenant.id, found.module.id)
  const values = await repository.listRecordValues(rows.map((row) => row.id))
  const keys: string[] = []
  for (const value of values) {
    if (value.fieldId !== field.id) continue
    const api = readCustomFieldValue({
      stringValue: value.stringValue,
      integerValue: value.integerValue,
      decimalValue: value.decimalValue,
      booleanValue: value.booleanValue,
      dateValue: value.dateValue,
      selectKey: value.selectKey,
      selectKeys: value.selectKeys,
      field: { fieldType: field.fieldType },
    })
    if (typeof api === 'string') keys.push(api)
    else if (Array.isArray(api)) keys.push(...api)
  }
  const options = Array.isArray(field.options) ? (field.options as Array<{ key: string; label: string }>) : []
  const labels = new Map(options.map((option) => [option.key, option.label]))
  const byValue = countBy(keys, labels)
  const report: FieldReport = {
    object: 'projects.custom-module-field-report',
    moduleId: found.module.id,
    moduleKey: found.module.key,
    fieldKey: field.key,
    total: rows.length,
    byValue,
  }
  const csv = toCsv(
    ['value', 'label', 'count'],
    byValue.map((row) => [row.key, row.label, row.count])
  )
  return { data: { report, csv }, error: null }
}

export async function getCreatedReport(
  organizationId: string,
  moduleId: string,
  query: ModuleReportQuery,
  roleKeys: string[] = []
): Promise<ServiceResult<{ report: CreatedReport; csv: string }>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const found = await resolveModule(resolved.tenant.id, moduleId)
  if (found.error) return { data: null, error: found.error }
  const forbidden = forbiddenIfRestricted(found.module as never as { restrictedToRoleKeys: string[] }, roleKeys)
  if (forbidden) return { data: null, error: forbidden }
  if (query.from === undefined || query.to === undefined || query.to <= query.from)
    return { data: null, error: getError('projects/invalid-period') }
  const rows = await repository.listRecordsForReport(resolved.tenant.id, found.module.id)
  const createdAt = rows.map((row) => Number(row.createdAt))
  const perDay = createdPerDay(createdAt, query.from, query.to)
  const total = perDay.reduce((sum, row) => sum + row.count, 0)
  const report: CreatedReport = {
    object: 'projects.custom-module-created-report',
    moduleId: found.module.id,
    moduleKey: found.module.key,
    from: query.from,
    to: query.to,
    total,
    perDay,
  }
  const csv = toCsv(
    ['day', 'count'],
    perDay.map((row) => [row.day, row.count])
  )
  return { data: { report, csv }, error: null }
}

export async function listWidgets(
  organizationId: string,
  query: ListWidgetsQuery
): Promise<ServiceResult<SerializedDashboardWidget[]>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const rows = await repository.listWidgets(resolved.tenant.id, query)
  return { data: rows.map((row) => serializeDashboardWidget(row as never)), error: null }
}

export async function createWidget(
  organizationId: string,
  body: CreateWidgetBody
): Promise<ServiceResult<SerializedDashboardWidget>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const found = await resolveModule(resolved.tenant.id, body.moduleId)
  if (found.error) return { data: null, error: found.error }
  const timestamp = now()
  const row = await repository.transaction(async (client) => {
    return client.dashboardWidget.create({
      data: {
        id: generateId('dashboardWidget'),
        tenantId: resolved.tenant.id,
        userId: body.userId ?? null,
        kind: body.kind,
        moduleId: found.module.id,
        config: (body.config ?? {}) as never,
        position: body.position ?? 0,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    })
  })
  return { data: serializeDashboardWidget(row as never), error: null }
}

export async function updateWidget(
  organizationId: string,
  widgetId: string,
  body: UpdateWidgetBody
): Promise<ServiceResult<SerializedDashboardWidget>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const existing = await repository.retrieveWidget(resolved.tenant.id, widgetId)
  if (!existing) return { data: null, error: getError('projects/dashboard-widget-not-found') }
  const row = await repository.transaction(async (client) => {
    return client.dashboardWidget.update({
      where: { id: existing.id },
      data: {
        ...(body.kind !== undefined ? { kind: body.kind } : {}),
        ...(body.userId !== undefined ? { userId: body.userId } : {}),
        ...(body.config !== undefined ? { config: body.config as never } : {}),
        ...(body.position !== undefined ? { position: body.position } : {}),
        updatedAt: now(),
      },
    })
  })
  return { data: serializeDashboardWidget(row as never), error: null }
}

export async function removeWidget(
  organizationId: string,
  widgetId: string
): Promise<ServiceResult<SerializedDashboardWidgetTombstone>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const existing = await repository.retrieveWidget(resolved.tenant.id, widgetId)
  if (!existing) return { data: null, error: getError('projects/dashboard-widget-not-found') }
  await repository.transaction(async (client) => {
    await client.dashboardWidget.delete({ where: { id: existing.id } })
  })
  return { data: { object: 'projects.dashboard-widget', id: widgetId, deleted: true }, error: null }
}
