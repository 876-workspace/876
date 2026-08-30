/**
 * Canonical resource ownership manifest for the unified `$876` facade.
 *
 * This is a compile/test/documentation invariant, not runtime routing. The
 * composers assemble the client directly; this file records which service is
 * authoritative for each canonical noun and what that noun means.
 */

export type ServiceOwner =
  | 'core'
  | 'billing'
  | 'couriers'
  | 'crm'
  | 'work'
  | 'storage'
  | 'widgets'

export interface ResourceOwnership {
  owner: ServiceOwner
  meaning: string
}

export const RESOURCE_MANIFEST = {
  auth: {
    owner: 'core',
    meaning:
      'authentication flows: login, registration, recovery, OTP and OAuth',
  },
  sessions: {
    owner: 'core',
    meaning:
      'authenticated sessions; self-scoped under me and platform-wide under admin',
  },
  oauth: { owner: 'core', meaning: 'OAuth authorization-server flows' },
  oauthGrants: {
    owner: 'core',
    meaning: 'consented OAuth grants for the user',
  },
  auditEvents: { owner: 'core', meaning: 'platform audit trail' },
  users: { owner: 'core', meaning: 'identity accounts (me / admin)' },
  organizations: { owner: 'core', meaning: 'enterprise workspaces' },
  memberships: { owner: 'core', meaning: 'org membership' },
  apps: { owner: 'core', meaning: 'platform application registry' },
  features: {
    owner: 'core',
    meaning: 'platform-controlled rollout flags, not app permissions',
  },
  entitlements: {
    owner: 'core',
    meaning:
      'whether an organization may open an app (org-to-app subscription)',
  },
  entitlementPlans: {
    owner: 'core',
    meaning: 'per-app entitlement plan/price catalog (Core /products)',
  },
  locations: { owner: 'core', meaning: 'organization locations' },
  contacts: { owner: 'core', meaning: 'organization contacts' },
  departments: { owner: 'core', meaning: 'org departments' },
  employees: { owner: 'core', meaning: 'org employees' },
  roles: {
    owner: 'core',
    meaning: 'organization roles governing 876 Enterprise itself',
  },
  permissions: {
    owner: 'core',
    meaning: 'organization permission catalog for the Enterprise plane',
  },
  organizationMembers: { owner: 'core', meaning: 'org member roster' },
  appAssignments: {
    owner: 'core',
    meaning: 'legacy-compatible per-member app assignment resource',
  },
  appPermissions: {
    owner: 'core',
    meaning: 'stable module.action capabilities declared by one product app',
  },
  appRoles: {
    owner: 'core',
    meaning: 'named app-specific permission bundles and platform templates',
  },
  appMemberships: {
    owner: 'core',
    meaning:
      'per-member per-app role, overrides, attributes and lifecycle profile',
  },
  invites: { owner: 'core', meaning: 'membership invitations' },
  mobileNumbers: {
    owner: 'core',
    meaning: "the current user's own mobile numbers (/users/me)",
  },
  mobileNumberVerifications: {
    owner: 'core',
    meaning: "OTP verifications for the user's own mobile numbers",
  },

  customers: {
    owner: 'billing',
    meaning: 'organization customer relationship registry',
  },
  products: {
    owner: 'billing',
    meaning: 'commercial catalog (things sold), NOT core entitlement plans',
  },
  plans: { owner: 'billing', meaning: 'billing plans' },
  prices: { owner: 'billing', meaning: 'billing prices' },
  priceLists: { owner: 'billing', meaning: 'price lists' },
  addons: { owner: 'billing', meaning: 'billing addons' },
  discounts: { owner: 'billing', meaning: 'billing discounts' },
  invoices: { owner: 'billing', meaning: 'financial invoices' },
  invoicePreferences: { owner: 'billing', meaning: 'invoice settings' },
  payments: { owner: 'billing', meaning: 'payments' },
  paymentModes: { owner: 'billing', meaning: 'payment modes' },
  paymentMethods: {
    owner: 'billing',
    meaning: 'non-secret reusable payment instrument metadata',
  },
  paymentIntents: { owner: 'billing', meaning: 'payment collection attempts' },
  paymentProviders: { owner: 'billing', meaning: 'payment providers' },
  paymentTerms: { owner: 'billing', meaning: 'payment terms' },
  subscriptions: {
    owner: 'billing',
    meaning:
      'commercial recurring agreements, NOT core org-to-app entitlements',
  },
  taxRates: { owner: 'billing', meaning: 'tax rates' },
  taxAuthorities: { owner: 'billing', meaning: 'tax authorities' },
  bankAccounts: { owner: 'billing', meaning: 'bank accounts' },
  bankTransactions: { owner: 'billing', meaning: 'bank transactions' },
  salespeople: { owner: 'billing', meaning: 'salespeople' },

  packages: { owner: 'couriers', meaning: 'courier packages' },
  branches: { owner: 'couriers', meaning: 'courier branches' },
  warehouses: { owner: 'couriers', meaning: 'courier warehouses' },
  mailboxes: { owner: 'couriers', meaning: 'courier mailboxes' },
  addresses: { owner: 'couriers', meaning: 'courier addresses' },

  customerProfiles: {
    owner: 'crm',
    meaning:
      'CRM enrollment/profile for a shared billing customer relationship',
  },
  requestCategories: {
    owner: 'crm',
    meaning: 'org-managed CRM request category and subcategory catalog',
  },
  requestForms: {
    owner: 'crm',
    meaning: 'versioned CRM request intake definitions and routing defaults',
  },
  requestFormSubmissions: {
    owner: 'crm',
    meaning:
      'immutable intake submissions that atomically create ordinary CRM requests',
  },
  requestFormRequests: {
    owner: 'crm',
    meaning:
      'customer-scoped request projection used by reusable intake/support surfaces',
  },
  requestReminders: {
    owner: 'crm',
    meaning:
      'CRM request-scoped reminder projection backed by canonical Work reminders',
  },
  requestEvents: {
    owner: 'crm',
    meaning:
      'CRM request-scoped scheduling projection backed by canonical Work events',
  },
  requests: {
    owner: 'crm',
    meaning: 'CRM customer service and relationship requests',
  },
  requestTasks: {
    owner: 'crm',
    meaning:
      'CRM request-scoped task projection backed by canonical Work tasks',
  },
  teams: {
    owner: 'crm',
    meaning: 'CRM routing teams (queues) an organization assigns requests to',
  },

  tasks: {
    owner: 'work',
    meaning:
      'canonical organization work items independent of their host-product context',
  },
  taskLists: {
    owner: 'work',
    meaning: 'canonical Work task-list organization and ordering',
  },
  taskLinks: {
    owner: 'work',
    meaning:
      'opaque cross-service context links connecting Work tasks to host resources',
  },
  taskAssignments: {
    owner: 'work',
    meaning:
      'first-class Work task assignment, collaboration, and delegation records',
  },
  reminders: {
    owner: 'work',
    meaning: 'standalone user Work reminders and their lifecycle',
  },
  recurrenceRules: {
    owner: 'work',
    meaning: 'reusable RFC 5545-compatible recurrence definitions for Work',
  },
  alerts: {
    owner: 'work',
    meaning: 'notification schedules attached to canonical Work tasks or events',
  },
  calendars: {
    owner: 'work',
    meaning: 'canonical shared and user-owned Work calendars',
  },
  calendarSubscriptions: {
    owner: 'work',
    meaning:
      'per-user role, visibility, colour, and reminder preferences for a Work calendar',
  },
  events: {
    owner: 'work',
    meaning: 'canonical timed and all-day Work calendar events',
  },
  eventParticipants: {
    owner: 'work',
    meaning:
      'internal-user and external-email participation state for Work events',
  },
  myWork: {
    owner: 'work',
    meaning:
      'read-model aggregation of a user’s assigned tasks, reminders, and calendar work',
  },
  workSyncConnections: {
    owner: 'work',
    meaning:
      'provider-neutral external calendar/task sync connection metadata and credential references',
  },
  workSyncMappings: {
    owner: 'work',
    meaning:
      'local-to-remote Work resource mappings, cursors, ETags, and interoperable UIDs',
  },
  workExports: {
    owner: 'work',
    meaning: 'Work-owned iCalendar and JSCalendar export operations',
  },

  files: { owner: 'storage', meaning: 'stored files' },
  uploads: { owner: 'storage', meaning: 'upload sessions' },
  notes: { owner: 'widgets', meaning: 'widget notes' },
  collections: { owner: 'widgets', meaning: 'widget collections' },
} as const satisfies Record<string, ResourceOwnership>

export type CanonicalResource = keyof typeof RESOURCE_MANIFEST

export interface KnownCollision {
  resource: CanonicalResource
  canonicalOwner: ServiceOwner
  conflictingUse: string
  plannedResolution: string
}

export const KNOWN_COLLISIONS: readonly KnownCollision[] = []
