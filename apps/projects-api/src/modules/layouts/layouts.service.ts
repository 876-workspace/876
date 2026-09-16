import { getError, type ProjectsError } from '../../http/errors.js'
import { generateId } from '../../platform/ids.js'
import { nowUnixSeconds, toDbUnixSeconds } from '../../platform/timestamps.js'
// The evaluator is the single implementation shared with browser clients in
// packages/projects. It is imported relatively so the workspace install
// graph stays unchanged.
import {
  evaluateLayoutRules,
  LAYOUT_SYSTEM_FIELD_KEYS,
  toLayoutValue,
  type Layout as EvaluatedLayout,
  type LayoutValues,
} from '../../../../../packages/projects/src/layout-rules.js'
import * as customFields from '../custom-fields/index.js'
import * as tenants from '../tenants/index.js'
import * as workStructure from '../work-structure/index.js'
import * as repository from './layouts.repository.js'
import {
  serializeLayout,
  type LayoutRow,
  type SerializedLayout,
  type SerializedLayoutTombstone,
} from './layouts.serializers.js'
import {
  layoutDefinitionSchema,
  type CreateLayoutBody,
  type LayoutDefinition,
  type LayoutEntity,
  type ListLayoutsQuery,
  type UpdateLayoutBody,
} from './layouts.schemas.js'

export type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: ProjectsError }

export {
  evaluateLayoutRules,
  LAYOUT_SYSTEM_FIELD_KEYS,
  toLayoutValue,
}
export type { EvaluatedLayout, LayoutValues }

export type LayoutFieldInput = Record<string, unknown>

type StoredLayout = {
  entity: string
  workItemTypeId: string | null
  isDefault: boolean
}

function now() {
  return toDbUnixSeconds(nowUnixSeconds())
}

async function resolveTenant(organizationId: string) {
  const tenant = await tenants.resolveTenant(organizationId)
  return tenant
    ? { tenant, error: null }
    : { tenant: null, error: getError('projects/tenant-not-found') }
}

type FieldCatalogEntry = {
  key: string
  position: number
  typeIds?: string[]
}

async function customFieldCatalog(
  organizationId: string,
  entity: LayoutEntity
): Promise<ServiceResult<FieldCatalogEntry[]>> {
  if (entity === 'project') {
    const result = await customFields.listCustomFields(organizationId)
    if (result.error) return { data: null, error: result.error }
    return {
      data: result.data.map((field) => ({
        key: field.key,
        position: field.position,
      })),
      error: null,
    }
  }
  if (entity === 'phase') {
    const result =
      await workStructure.milestoneDetails.listCustomFields(organizationId)
    if (result.error) return { data: null, error: result.error }
    return {
      data: result.data.map((field) => ({
        key: field.key,
        position: field.position,
      })),
      error: null,
    }
  }
  const result = await workStructure.listCustomFields(organizationId)
  if (result.error) return { data: null, error: result.error }
  return {
    data: result.data.map((field) => ({
      key: field.key,
      position: field.position,
      typeIds: field.typeIds,
    })),
    error: null,
  }
}

function collectFieldKeys(definition: LayoutDefinition): string[] {
  const keys = definition.sections.flatMap((section) =>
    section.fields.map((field) => field.fieldKey)
  )
  for (const rule of definition.rules) {
    for (const condition of rule.when) keys.push(condition.fieldKey)
    for (const effect of rule.then) keys.push(effect.fieldKey)
  }
  return keys
}

function validateDefinitionShape(definition: LayoutDefinition): ProjectsError | null {
  if (!layoutDefinitionSchema.safeParse(definition).success)
    return getError('projects/invalid-request')
  return null
}

async function validateFieldKeys(
  organizationId: string,
  entity: LayoutEntity,
  definition: LayoutDefinition
): Promise<ProjectsError | null> {
  const catalog = await customFieldCatalog(organizationId, entity)
  if (catalog.error) return catalog.error
  const knownCustomKeys = new Set(
    catalog.data.map((field) => `cf:${field.key}`)
  )
  for (const key of collectFieldKeys(definition)) {
    if (
      (LAYOUT_SYSTEM_FIELD_KEYS as readonly string[]).includes(key) ||
      knownCustomKeys.has(key)
    )
      continue
    return getError('projects/invalid-request', {
      description: `Unknown layout field key: "${key}".`,
    })
  }
  return null
}

function pickStoredLayout<T extends StoredLayout>(
  layouts: T[],
  entity: LayoutEntity,
  workItemTypeId: string | null
): T | null {
  if (entity === 'work-item' && workItemTypeId)
    return (
      layouts.find(
        (layout) =>
          layout.isDefault && layout.workItemTypeId === workItemTypeId
      ) ??
      layouts.find(
        (layout) => layout.isDefault && layout.workItemTypeId === null
      ) ??
      null
    )
  return (
    layouts.find(
      (layout) => layout.isDefault && layout.workItemTypeId === null
    ) ?? null
  )
}

async function builtInLayout(
  organizationId: string,
  entity: LayoutEntity,
  workItemTypeId: string | null
): Promise<ServiceResult<SerializedLayout>> {
  const catalog = await customFieldCatalog(organizationId, entity)
  if (catalog.error) return { data: null, error: catalog.error }
  const entries = [...catalog.data]
    .filter((field) =>
      entity === 'work-item' && workItemTypeId && field.typeIds
        ? field.typeIds.length === 0 || field.typeIds.includes(workItemTypeId)
        : true
    )
    .sort((left, right) => left.position - right.position)
  const row: LayoutRow = {
    id: '',
    tenantId: '',
    entity,
    workItemTypeId,
    name: 'Built-in default',
    definition: {
      sections: [
        {
          key: 'main',
          title: 'Details',
          columns: 1,
          fields: [
            ...LAYOUT_SYSTEM_FIELD_KEYS.map((fieldKey) => ({
              fieldKey,
              width: 1 as const,
              visible: true,
            })),
            ...entries.map((field) => ({
              fieldKey: `cf:${field.key}`,
              width: 1 as const,
              visible: true,
            })),
          ],
        },
      ],
      rules: [],
    },
    version: 1,
    isDefault: true,
    deletedAt: null,
    createdAt: 0,
    updatedAt: 0,
  }
  return { data: serializeLayout(row, { builtIn: true }), error: null }
}

export async function listLayouts(
  organizationId: string,
  query: ListLayoutsQuery = {}
): Promise<ServiceResult<SerializedLayout[]>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const rows = await repository.listLayouts(resolved.tenant.id)
  return {
    data: rows
      .filter((row) => (query.entity ? row.entity === query.entity : true))
      .filter((row) =>
        query.workItemTypeId ? row.workItemTypeId === query.workItemTypeId : true
      )
      .map((row) => serializeLayout(row as LayoutRow)),
    error: null,
  }
}

export async function createLayout(
  organizationId: string,
  body: CreateLayoutBody
): Promise<ServiceResult<SerializedLayout>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const workItemTypeId = body.workItemTypeId ?? null
  if (workItemTypeId !== null && body.entity !== 'work-item')
    return { data: null, error: getError('projects/invalid-request') }
  if (workItemTypeId !== null) {
    const type = await workStructure.retrieveWorkItemType(
      organizationId,
      workItemTypeId
    )
    if (type.error) return { data: null, error: type.error }
  }
  const definition: LayoutDefinition = {
    sections: body.sections,
    rules: body.rules ?? [],
  }
  const shapeError = validateDefinitionShape(definition)
  if (shapeError) return { data: null, error: shapeError }
  const keysError = await validateFieldKeys(
    organizationId,
    body.entity,
    definition
  )
  if (keysError) return { data: null, error: keysError }
  const existing = await repository.listLayouts(resolved.tenant.id)
  const hasDefault = existing.some(
    (layout) =>
      layout.isDefault &&
      layout.entity === body.entity &&
      (layout.workItemTypeId ?? null) === workItemTypeId
  )
  const isDefault = body.isDefault ?? !hasDefault
  if (isDefault)
    await repository.clearDefaultInScope(
      resolved.tenant.id,
      body.entity,
      workItemTypeId
    )
  const timestamp = now()
  const row = await repository.createLayout({
    id: generateId('layout'),
    tenantId: resolved.tenant.id,
    entity: body.entity,
    workItemTypeId,
    name: body.name,
    definition,
    version: 1,
    isDefault,
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  return { data: serializeLayout(row as LayoutRow), error: null }
}

export async function retrieveLayout(
  organizationId: string,
  id: string
): Promise<ServiceResult<SerializedLayout>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const row = await repository.retrieveLayout(resolved.tenant.id, id)
  return row
    ? { data: serializeLayout(row as LayoutRow), error: null }
    : { data: null, error: getError('projects/layout-not-found') }
}

export async function updateLayout(
  organizationId: string,
  id: string,
  body: UpdateLayoutBody
): Promise<ServiceResult<SerializedLayout>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const existing = await repository.retrieveLayout(resolved.tenant.id, id)
  if (!existing)
    return { data: null, error: getError('projects/layout-not-found') }
  const current = serializeLayout(existing as LayoutRow)
  const definition: LayoutDefinition = {
    sections: body.sections ?? current.sections,
    rules: body.rules ?? current.rules,
  }
  const shapeError = validateDefinitionShape(definition)
  if (shapeError) return { data: null, error: shapeError }
  const keysError = await validateFieldKeys(
    organizationId,
    current.entity,
    definition
  )
  if (keysError) return { data: null, error: keysError }
  const row = await repository.updateLayout(id, {
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...((body.sections !== undefined || body.rules !== undefined)
      ? { definition }
      : {}),
    version: { increment: 1 },
    updatedAt: now(),
  })
  return { data: serializeLayout(row as LayoutRow), error: null }
}

export async function removeLayout(
  organizationId: string,
  id: string
): Promise<ServiceResult<SerializedLayoutTombstone>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const existing = await repository.retrieveLayout(resolved.tenant.id, id)
  if (!existing)
    return { data: null, error: getError('projects/layout-not-found') }
  await repository.softDeleteLayout(id, now())
  return {
    data: { object: 'projects.layout' as const, id, deleted: true as const },
    error: null,
  }
}

export async function makeDefaultLayout(
  organizationId: string,
  id: string
): Promise<ServiceResult<SerializedLayout>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const existing = await repository.retrieveLayout(resolved.tenant.id, id)
  if (!existing)
    return { data: null, error: getError('projects/layout-not-found') }
  await repository.clearDefaultInScope(
    resolved.tenant.id,
    existing.entity,
    existing.workItemTypeId
  )
  const row = await repository.updateLayout(id, {
    isDefault: true,
    updatedAt: now(),
  })
  return { data: serializeLayout(row as LayoutRow), error: null }
}

export async function resolveLayout(
  organizationId: string,
  entity: LayoutEntity,
  workItemTypeId?: string | null
): Promise<ServiceResult<SerializedLayout>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const rows = await repository.listLayouts(resolved.tenant.id)
  const stored = pickStoredLayout(
    rows.filter((row) => row.entity === entity),
    entity,
    workItemTypeId ?? null
  )
  if (stored) return { data: serializeLayout(stored as LayoutRow), error: null }
  return builtInLayout(organizationId, entity, workItemTypeId ?? null)
}

function isEmptyLayoutValue(
  value: string | string[] | null | undefined
): boolean {
  return (
    value === null ||
    value === undefined ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  )
}

function normalizedValues(input: LayoutFieldInput): LayoutValues {
  const values: LayoutValues = {}
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue
    values[key] = toLayoutValue(value)
  }
  return values
}

function isChangedValue(previous: unknown, next: unknown): boolean {
  return (
    JSON.stringify(toLayoutValue(previous) ?? null) !==
    JSON.stringify(toLayoutValue(next) ?? null)
  )
}

/**
 * Enforces the resolved layout's `require` and `disable` rules on a
 * create or update. Presentation effects (`show`/`hide`) stay unenforced.
 */
export async function enforceLayoutRules(input: {
  organizationId: string
  entity: LayoutEntity
  workItemTypeId?: string | null
  existing: LayoutFieldInput
  incoming: LayoutFieldInput
}): Promise<ServiceResult<null>> {
  const resolved = await resolveTenant(input.organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const rows = await repository.listLayouts(resolved.tenant.id)
  const stored = pickStoredLayout(
    rows.filter((row) => row.entity === input.entity),
    input.entity,
    input.workItemTypeId ?? null
  )
  if (!stored) return { data: null, error: null }
  const serialized = serializeLayout(stored as LayoutRow)
  const layout: EvaluatedLayout = {
    object: 'projects.layout',
    id: serialized.id,
    entity: serialized.entity,
    workItemTypeId: serialized.workItemTypeId,
    name: serialized.name,
    version: serialized.version,
    isDefault: serialized.isDefault,
    builtIn: false,
    sections: serialized.sections,
    rules: serialized.rules,
  }
  const existing = normalizedValues(input.existing)
  const incoming = normalizedValues(input.incoming)
  const states = evaluateLayoutRules(layout, { ...existing, ...incoming })
  const missing = Object.entries(states)
    .filter(([, state]) => state.required)
    .map(([fieldKey]) => fieldKey)
    .filter((fieldKey) => isEmptyLayoutValue({ ...existing, ...incoming }[fieldKey]))
    .sort()
  if (missing.length > 0)
    return {
      data: null,
      error: getError('projects/layout-required-fields', {
        param: missing.join(','),
      }),
    }
  const disabled = Object.keys(incoming)
    .filter(
      (fieldKey) =>
        states[fieldKey]?.disabled &&
        isChangedValue(existing[fieldKey], incoming[fieldKey])
    )
    .sort()
  if (disabled.length > 0)
    return {
      data: null,
      error: getError('projects/layout-field-disabled', {
        param: disabled.join(','),
      }),
    }
  return { data: null, error: null }
}
