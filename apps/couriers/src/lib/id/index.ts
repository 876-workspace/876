import { createPrefixedId } from '@876/core/id'

/**
 * Couriers-local entity prefixes — only entities in Couriers' own datastore
 * (`apps/couriers/prisma/`), never core identity/platform entities. See
 * `.claude/rules/platform-services.md`.
 *
 * Keys match Prisma model names exactly (PascalCase) — the `$allModels`
 * query extension in `../db` looks up `model in ENTITY_PREFIXES` using
 * Prisma's own model name.
 */
const ENTITY_PREFIXES = {
  Branch: 'brn',
  CourierCustomerProfile: 'cus',
  CustomerAddress: 'cadr',
  Mailbox: 'mbx',
  Domain: 'dom',
  Package: 'pkg',
  Contact: 'con',
  Role: 'role',
  TeamMember: 'tmem',
  Tenant: 'ten',
  Warehouse: 'whs',
} as const

export type EntityType = keyof typeof ENTITY_PREFIXES

export function generateId(entityType: EntityType): string {
  return createPrefixedId(ENTITY_PREFIXES[entityType])
}

export { ENTITY_PREFIXES as COURIERS_ID_PREFIXES }
