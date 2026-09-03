import { fromDbUnixSeconds } from '../../platform/timestamps.js'

export type LabelRow = {
  id: string
  tenantId: string
  name: string
  color: string
  description: string | null
  createdAt: bigint | number
  updatedAt: bigint | number
}

export type SerializedLabel = {
  object: 'projects.label'
  id: string
  tenantId: string
  name: string
  color: string
  description: string | null
  createdAt: number
  updatedAt: number
}

export type SerializedLabelTombstone = {
  object: 'projects.label'
  id: string
  deleted: true
}

export function serializeLabel(row: LabelRow): SerializedLabel {
  return {
    object: 'projects.label',
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    color: row.color,
    description: row.description,
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}
