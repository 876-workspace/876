import type { EntityType } from '../../types/id'

/**
 * Entity type prefixes for ID generation.
 * Each entity has a unique, readable prefix.
 */
const ENTITY_PREFIXES: Record<EntityType, string> = {
  account: 'acc',
  address: 'adr',
  apiKey: '876_app_key',
  authorizationCode: 'auc',
  contact: 'cnt',
  currency: 'cur',
  customer: 'cus',
  department: 'dep',
  device: 'dev',
  email: 'eml',
  event: 'evt',
  feature: 'ftr',
  featureFlag: 'flg',
  featureFlagOverride: 'flo',
  group: 'grp',
  importJob: 'imj',
  importJobRow: 'imr',
  importTemplate: 'imt',
  invoice: 'inv',
  log: 'log',
  membership: 'mem',
  mobileNumber: 'mob',
  note: 'nte',
  notification: 'ntf',
  oauthGrant: 'oag',
  orgFeature: 'ofe',
  organization: 'org',
  permission: 'per',
  plan: 'pln',
  registeredApp: 'rap',
  record: 'rec',
  role: 'rol',
  session: 'ses',
  subscription: 'sub',
  team: 'tem',
  ticket: 'tkt',
  user: 'user',
  userFeature: 'ufe',
  userProfile: 'upr',
} as const

/**
 * Builds a `{prefix}_{32-character-uuid-without-dashes}` ID. Shared by this
 * module's own `generateId` and by app-local ID generators (Console,
 * Couriers) that own their own prefix maps for app-local entities.
 */
export function createPrefixedId(prefix: string): string {
  const uuid = crypto.randomUUID().replace(/-/g, '')
  return `${prefix}_${uuid}`
}

/**
 * Generates a unique identifier for the specified entity type.
 *
 * @throws {Error} If the entity type is not recognized
 * @example generateId("user") // 'user_a1b2c3d4e5f6...'
 */
export function generateId(entityType: EntityType): string {
  const prefix = ENTITY_PREFIXES[entityType]

  if (!prefix) {
    throw new Error(
      `Unknown entity type: ${entityType}. Valid types are: ${Object.keys(ENTITY_PREFIXES).join(', ')}`
    )
  }

  return createPrefixedId(prefix)
}

/**
 * Generates a deterministic app ID based on the app slug.
 *
 * Format: app_{slug}
 *
 * @param slug - The app slug (e.g., 'inventory', 'courier')
 * @returns A deterministic app ID (e.g., 'app_inventory', 'app_courier')
 *
 * @example
 * ```typescript
 * import { generateAppId } from "lib/id";
 *
 * const inventoryId = generateAppId("inventory");  // 'app_inventory'
 * const courierId = generateAppId("courier");       // 'app_courier'
 * const dashboardId = generateAppId("dashboard");   // 'app_dashboard'
 * ```
 */
export function generateAppId(slug: string): string {
  if (!slug || typeof slug !== 'string') {
    throw new Error('App slug must be a non-empty string')
  }

  // Normalize slug to lowercase and replace any non-alphanumeric characters with underscores
  const normalizedSlug = slug
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_') // Collapse multiple underscores
    .replace(/^_|_$/g, '') // Remove leading/trailing underscores

  return `app_${normalizedSlug}`
}

/**
 * Gets the prefix for a given entity type.
 *
 * @param entityType - The type of entity
 * @returns The prefix for that entity type
 *
 * @example
 * ```typescript
 * const prefix = getEntityPrefix("user"); // 'user'
 * ```
 */
export function getEntityPrefix(entityType: EntityType): string {
  const prefix = ENTITY_PREFIXES[entityType]

  if (!prefix) {
    throw new Error(`Unknown entity type: ${entityType}`)
  }

  return prefix
}

/**
 * List of all supported entity types.
 */
export const SUPPORTED_ENTITIES = Object.keys(ENTITY_PREFIXES) as EntityType[]
