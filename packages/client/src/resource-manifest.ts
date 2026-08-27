/**
 * Canonical resource ownership manifest for the unified `$876` facade.
 *
 * This is a compile/test/documentation invariant, not runtime routing. The
 * composers assemble the client directly; this file records which service is
 * authoritative for each canonical noun and what that noun means.
 */

export type ServiceOwner =
  'core' | 'billing' | 'couriers' | 'crm' | 'storage' | 'widgets'

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
  requestReminders: {
    owner: 'crm',
    meaning: 'time-based reminders on a CRM request',
  },
  requests: {
    owner: 'crm',
    meaning: 'CRM customer service and relationship requests',
  },
  requestTasks: {
    owner: 'crm',
    meaning: 'actionable follow-up items on a CRM request',
  },
  teams: {
    owner: 'crm',
    meaning: 'CRM routing teams (queues) an organization assigns requests to',
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
