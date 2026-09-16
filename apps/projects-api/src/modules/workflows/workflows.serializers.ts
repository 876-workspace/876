import type { TransitionInput } from './workflows.schemas.js'

type Timestamp = bigint | number

export type TransitionRow = {
  id: string
  tenantId: string
  workItemTypeId: string | null
  fromStateKey: string | null
  toStateKey: string
  name: string
  requiredPermission: string | null
  requiredFieldKeys: string[]
  requiresComment: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type SerializedTransition = {
  object: 'projects.workflow-transition'
  id: string
  workItemTypeId: string | null
  fromStateKey: string | null
  toStateKey: string
  name: string
  requiredPermission: string | null
  requiredFieldKeys: string[]
  requiresComment: boolean
  createdAt: number
  updatedAt: number
}

export type SerializedBlueprint = {
  object: 'projects.workflow-blueprint'
  workItemTypeId: string
  updatedAt: number | null
  transitions: SerializedTransition[]
}

export function serializeTransition(row: TransitionRow): SerializedTransition {
  return {
    object: 'projects.workflow-transition',
    id: row.id,
    workItemTypeId: row.workItemTypeId,
    fromStateKey: row.fromStateKey,
    toStateKey: row.toStateKey,
    name: row.name,
    requiredPermission: row.requiredPermission,
    requiredFieldKeys: [...row.requiredFieldKeys],
    requiresComment: row.requiresComment,
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt),
  }
}

export function serializeBlueprint(
  workItemTypeId: string,
  rows: TransitionRow[]
): SerializedBlueprint {
  const sorted = [...rows].sort((a, b) =>
    a.toStateKey.localeCompare(b.toStateKey)
  )
  const updatedAt =
    sorted.length === 0
      ? null
      : Math.max(...sorted.map((row) => Number(row.updatedAt)))
  return {
    object: 'projects.workflow-blueprint',
    workItemTypeId,
    updatedAt,
    transitions: sorted.map(serializeTransition),
  }
}

export type { TransitionInput }
