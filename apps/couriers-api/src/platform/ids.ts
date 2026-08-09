import { randomUUID } from 'node:crypto'

export const ENTITY_PREFIXES = {
  request: 'req',
  tenant: 'ten',
} as const

export type EntityType = keyof typeof ENTITY_PREFIXES

export function generateId(entityType: EntityType): string {
  const prefix = ENTITY_PREFIXES[entityType]
  if (!prefix) throw new Error(`Unknown entity type: ${entityType}`)
  return `${prefix}_${randomUUID().replaceAll('-', '')}`
}
