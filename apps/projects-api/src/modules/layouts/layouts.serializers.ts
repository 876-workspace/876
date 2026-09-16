import {
  layoutDefinitionSchema,
  type LayoutEntity,
  type LayoutRule,
  type LayoutSection,
} from './layouts.schemas.js'

type Timestamp = bigint | number

export type LayoutRow = {
  id: string
  tenantId: string
  entity: string
  workItemTypeId: string | null
  name: string
  definition: unknown
  version: number
  isDefault: boolean
  deletedAt: Timestamp | null
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type SerializedLayout = {
  object: 'projects.layout'
  id: string | null
  entity: LayoutEntity
  workItemTypeId: string | null
  name: string
  version: number
  isDefault: boolean
  builtIn: boolean
  sections: LayoutSection[]
  rules: LayoutRule[]
}

export type SerializedLayoutTombstone = {
  object: 'projects.layout'
  id: string
  deleted: true
}

export function serializeLayout(
  row: LayoutRow,
  options?: { builtIn?: boolean }
): SerializedLayout {
  const definition = layoutDefinitionSchema.parse(row.definition)
  return {
    object: 'projects.layout',
    id: options?.builtIn ? null : row.id,
    entity: row.entity as LayoutEntity,
    workItemTypeId: row.workItemTypeId,
    name: row.name,
    version: row.version,
    isDefault: options?.builtIn ? true : row.isDefault,
    builtIn: options?.builtIn ?? false,
    sections: definition.sections,
    rules: definition.rules,
  }
}
