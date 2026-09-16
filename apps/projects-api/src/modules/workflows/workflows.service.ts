import { getError, type ProjectsError } from '../../http/errors.js'
import { generateId } from '../../platform/ids.js'
import { nowUnixSeconds, toDbUnixSeconds } from '../../platform/timestamps.js'
import { toLayoutValue } from '../../../../../packages/projects/src/layout-rules.js'
import * as tenants from '../tenants/index.js'
import * as workStructure from '../work-structure/index.js'
import * as repository from './workflows.repository.js'
import {
  serializeBlueprint,
  type SerializedBlueprint,
} from './workflows.serializers.js'
import type { BlueprintBody } from './workflows.schemas.js'

export type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: ProjectsError }

function now() {
  return toDbUnixSeconds(nowUnixSeconds())
}

function isEmptyFieldValue(value: unknown): boolean {
  const normalized = toLayoutValue(value)
  return (
    normalized === null ||
    normalized === undefined ||
    normalized === '' ||
    (Array.isArray(normalized) && normalized.length === 0)
  )
}

async function resolveTenant(organizationId: string) {
  const tenant = await tenants.resolveTenant(organizationId)
  return tenant
    ? { tenant, error: null }
    : { tenant: null, error: getError('projects/tenant-not-found') }
}

async function resolveType(tenantId: string, workItemTypeId: string) {
  const type = await workStructure.resolveWorkItemTypeById(
    tenantId,
    workItemTypeId
  )
  return type
    ? { type, error: null }
    : { type: null, error: getError('projects/work-item-type-not-found') }
}

export async function getBlueprint(
  organizationId: string,
  workItemTypeId: string
): Promise<ServiceResult<SerializedBlueprint>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const type = await resolveType(resolved.tenant.id, workItemTypeId)
  if (type.error) return { data: null, error: type.error }
  const rows = await repository.listTransitionsForType(
    resolved.tenant.id,
    workItemTypeId
  )
  return { data: serializeBlueprint(workItemTypeId, rows), error: null }
}

export async function putBlueprint(
  organizationId: string,
  workItemTypeId: string,
  body: BlueprintBody
): Promise<ServiceResult<SerializedBlueprint>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const type = await resolveType(resolved.tenant.id, workItemTypeId)
  if (type.error) return { data: null, error: type.error }

  const seen = new Set<string>()
  for (const transition of body.transitions) {
    const pair = `${transition.fromStateKey ?? ''}→${transition.toStateKey}`
    if (seen.has(pair))
      return {
        data: null,
        error: getError('projects/invalid-request', {
          param: 'transitions',
          description: `Duplicate transition ${pair}.`,
        }),
      }
    seen.add(pair)
  }

  const stateKeys = new Set<string>()
  for (const transition of body.transitions) {
    if (transition.fromStateKey) stateKeys.add(transition.fromStateKey)
    stateKeys.add(transition.toStateKey)
  }
  for (const key of stateKeys) {
    const state = await workStructure.resolveWorkflowStateByKey(
      resolved.tenant.id,
      key
    )
    if (!state)
      return {
        data: null,
        error: getError('projects/workflow-state-not-found', {
          param: key,
        }),
      }
  }

  const timestamp = now()
  const rows = await repository.replaceBlueprint(
    resolved.tenant.id,
    workItemTypeId,
    body.transitions.map((transition) => ({
      id: generateId('workflowTransition'),
      tenantId: resolved.tenant.id,
      workItemTypeId,
      fromStateKey: transition.fromStateKey ?? null,
      toStateKey: transition.toStateKey,
      name: transition.name,
      requiredPermission: transition.requiredPermission ?? null,
      requiredFieldKeys: transition.requiredFieldKeys ?? [],
      requiresComment: transition.requiresComment ?? false,
      createdAt: timestamp,
      updatedAt: timestamp,
    }))
  )
  return { data: serializeBlueprint(workItemTypeId, rows), error: null }
}

export type TransitionCheckInput = {
  tenantId: string
  workItemTypeId: string
  fromStateKey: string
  toStateKey: string
  fieldValues: Record<string, unknown>
  comment?: string | null
  permissions?: string[]
}

/**
 * Enforces the workflow blueprint for one state change. Types without any
 * transition rows stay fully backwards compatible: every change is allowed.
 */
export async function checkTransition(
  input: TransitionCheckInput
): Promise<ServiceResult<null>> {
  const rows = await repository.listTransitionsForType(
    input.tenantId,
    input.workItemTypeId
  )
  if (rows.length === 0) return { data: null, error: null }

  const match = rows.find(
    (row) =>
      (row.fromStateKey === null || row.fromStateKey === input.fromStateKey) &&
      row.toStateKey === input.toStateKey
  )
  if (!match)
    return {
      data: null,
      error: getError('projects/transition-not-allowed', {
        param: `${input.fromStateKey}→${input.toStateKey}`,
      }),
    }

  const missing: string[] = []
  if (
    match.requiredPermission &&
    !(input.permissions ?? []).includes(match.requiredPermission)
  )
    missing.push(`permission:${match.requiredPermission}`)
  for (const fieldKey of match.requiredFieldKeys) {
    if (isEmptyFieldValue(input.fieldValues[fieldKey])) missing.push(fieldKey)
  }
  if (match.requiresComment && !input.comment?.trim()) missing.push('comment')

  if (missing.length > 0)
    return {
      data: null,
      error: getError('projects/transition-requirements-unmet', {
        param: missing.join(','),
      }),
    }
  return { data: null, error: null }
}
