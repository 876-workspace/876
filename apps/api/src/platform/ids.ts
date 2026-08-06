import { randomUUID } from 'node:crypto'

/**
 * Prefix registry for every entity that gets a generated ID.
 *
 * These prefixes are baked into every row already in the database and into
 * client code that pattern-matches on them, so a prefix is a permanent
 * contract — adding one is fine, changing one is not
 * (.claude/rules/naming.md).
 */
export const ENTITY_PREFIXES = {
  account: 'acc',
  address: 'adr',
  appAssignment: 'asg',
  applicationModule: 'mod',
  auditEvent: 'aud',
  apiKey: '876_app_key',
  authProvider: 'aup',
  authAttempt: 'atmp',
  userPin: 'pin',
  authorizationCode: 'auc',
  billingAccount: 'ba',
  billingCustomerEvent: 'bce',
  billingProviderObject: 'bpo',
  call: 'cal',
  contact: 'cnt',
  currency: 'cur',
  customer: 'cus',
  department: 'dep',
  device: 'dev',
  email: 'eml',
  employeeProfile: 'emp',
  event: 'evt',
  feature: 'ftr',
  featureFlag: 'flg',
  featureFlagOverride: 'flo',
  featureFlagMigrationArchive: 'fma',
  financeProvisioningEvent: 'fpe',
  group: 'grp',
  importJob: 'imj',
  importJobRow: 'imr',
  importTemplate: 'imt',
  invite: 'ivt',
  invoice: 'inv',
  log: 'log',
  membership: 'mem',
  message: 'msg',
  mobileNumber: 'mob',
  note: 'nte',
  notification: 'ntf',
  onboardingAnswer: 'oba',
  onboardingSession: 'obs',
  oauthGrant: 'oag',
  orgContact: 'ctc',
  orgFeature: 'ofe',
  orgLocation: 'loc',
  organization: 'org',
  permission: 'per',
  plan: 'pln',
  planModule: 'pmo',
  price: 'prc',
  product: 'prd',
  refreshToken: 'ort',
  registeredApp: 'rap',
  provisioningManifest: 'pm',
  provisioningRevision: 'pmr',
  provisioningResource: 'prs',
  provisioningProperty: 'prp',
  provisioningStep: 'pst',
  provisioningNote: 'pnt',
  provisioningRun: 'prn',
  provisioningRunStep: 'prst',
  record: 'rec',
  request: 'req',
  role: 'rol',
  session: 'ses',
  socialPlatform: 'sop',
  ssoConnection: 'sco',
  ssoIdentity: 'ssi',
  subscription: 'sub',
  subscriptionItem: 'sbi',
  team: 'tem',
  ticket: 'tkt',
  user: 'user',
  userAppEnrollment: 'uae',
  userFeature: 'ufe',
  userIdentification: 'uident',
  userProfile: 'upr',
  userSocialProfile: 'usp',
  verification: 'ver',
  webhookEvent: 'whe',
} as const

export type EntityType = keyof typeof ENTITY_PREFIXES

/**
 * Generate a prefixed identifier, e.g. `user_3f2a…` (32 hex characters).
 *
 * The shape matches what the FastAPI service produced — a UUIDv4 with its
 * dashes removed — so IDs minted before and after the migration are
 * indistinguishable.
 */
export function generateId(entityType: EntityType): string {
  const prefix = ENTITY_PREFIXES[entityType]
  if (!prefix) throw new Error(`Unknown entity type: ${entityType}`)

  return `${prefix}_${randomUUID().replaceAll('-', '')}`
}

/**
 * The platform owner's user ID carries an `876_` prefix instead of `user_`, so
 * the single account that owns the platform is recognisable at a glance in
 * logs and audit trails.
 */
export function generatePlatformOwnerUserId(): string {
  return generateId('user').replace('user_', '876_')
}

export function normalizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}
