/** Canonical resource ownership manifest for the unified `$876` facade. */
export type ServiceOwner =
  | 'core'
  | 'billing'
  | 'couriers'
  | 'crm'
  | 'storage'
  | 'widgets'

export interface ResourceOwnership {
  owner: ServiceOwner
  meaning: string
}

export const RESOURCE_MANIFEST = {
  auth: { owner: 'core', meaning: 'authentication flows' },
  sessions: { owner: 'core', meaning: 'authenticated sessions' },
  oauth: { owner: 'core', meaning: 'OAuth authorization-server flows' },
  oauthGrants: { owner: 'core', meaning: 'consented OAuth grants for the user' },
  auditEvents: { owner: 'core', meaning: 'platform audit trail' },
  users: { owner: 'core', meaning: 'identity accounts' },
  organizations: { owner: 'core', meaning: 'enterprise workspaces' },
  memberships: { owner: 'core', meaning: 'org membership' },
  apps: { owner: 'core', meaning: 'platform application registry' },
  features: { owner: 'core', meaning: 'feature flags' },
  entitlements: { owner: 'core', meaning: 'org/user access to 876 apps' },
  entitlementPlans: { owner: 'core', meaning: 'per-app entitlement plan catalog' },
  locations: { owner: 'core', meaning: 'organization locations' },
  contacts: { owner: 'core', meaning: 'organization contacts' },
  departments: { owner: 'core', meaning: 'org departments' },
  employees: { owner: 'core', meaning: 'org employees' },
  roles: { owner: 'core', meaning: 'platform + courier roles (unified)' },
  permissions: { owner: 'core', meaning: 'permission catalog' },
  organizationMembers: { owner: 'core', meaning: 'org member roster' },
  appAssignments: { owner: 'core', meaning: 'per-member app assignment' },
  invites: { owner: 'core', meaning: 'membership invitations' },
  mobileNumbers: { owner: 'core', meaning: "the current user's own mobile numbers" },
  mobileNumberVerifications: { owner: 'core', meaning: 'OTP verifications for mobile numbers' },
  customers: { owner: 'billing', meaning: 'organization customer relationship registry' },
  products: { owner: 'billing', meaning: 'commercial catalog' },
  plans: { owner: 'billing', meaning: 'billing plans' },
  prices: { owner: 'billing', meaning: 'billing prices' },
  priceLists: { owner: 'billing', meaning: 'price lists' },
  addons: { owner: 'billing', meaning: 'billing addons' },
  discounts: { owner: 'billing', meaning: 'billing discounts' },
  invoices: { owner: 'billing', meaning: 'financial invoices' },
  invoicePreferences: { owner: 'billing', meaning: 'invoice settings' },
  payments: { owner: 'billing', meaning: 'payments' },
  paymentModes: { owner: 'billing', meaning: 'payment modes' },
  paymentMethods: { owner: 'billing', meaning: 'payment instrument metadata' },
  paymentIntents: { owner: 'billing', meaning: 'payment collection attempts' },
  paymentProviders: { owner: 'billing', meaning: 'payment providers' },
  paymentTerms: { owner: 'billing', meaning: 'payment terms' },
  subscriptions: { owner: 'billing', meaning: 'commercial recurring agreements' },
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
    meaning: 'CRM enrollment/profile for a shared billing customer relationship',
  },
  requests: { owner: 'crm', meaning: 'CRM customer service and relationship requests' },
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
