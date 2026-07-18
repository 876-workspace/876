import { createPrefixedId } from '@876/core/id'

/**
 * Console-local entity prefixes — only entities in Console's own datastore
 * (`apps/console/prisma/`), never core identity/platform entities. See
 * `.claude/rules/platform-services.md`.
 */
const ENTITY_PREFIXES = {
  note: 'nte',
} as const

export type EntityType = keyof typeof ENTITY_PREFIXES

export function generateId(entityType: EntityType): string {
  return createPrefixedId(ENTITY_PREFIXES[entityType])
}

export { ENTITY_PREFIXES as CONSOLE_ID_PREFIXES }
