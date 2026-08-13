/**
 * Canonical resource ownership manifest for the unified `$876` facade.
 *
 * This is a **compile/test/documentation invariant, not runtime routing.** The
 * composers (`src/composers/*`) still assemble the client directly; this file
 * records, in one place, which service is authoritative for each canonical noun
 * and what that noun means. Tests assert the manifest against the real composed
 * surfaces so that:
 *
 *   1. a resource cannot be silently dropped from an app surface (the #255/#256
 *      failure mode, where `oauthGrants` / `auditEvents` disappeared and was
 *      only caught by a Cloudflare build), and
 *   2. a canonical noun cannot quietly change meaning between apps (the
 *      `$876.products` collision this manifest documents below).
 *
 * The authority for the intended ontology is `docs/platform-object-model.md`.
 * Where the current code disagrees with that document, the disagreement is
 * recorded in {@link KNOWN_COLLISIONS} rather than hidden — see
 * `docs/architecture/011-unified-facade-namespace-invariants.md`.
 */

export type ServiceOwner =
  | 'core'
  | 'billing'
  | 'couriers'
  | 'storage'
  | 'widgets'

export interface ResourceOwnership {
  /** The service that is authoritative for this canonical noun. */
  owner: ServiceOwner
  /** One-line meaning of the noun, to keep two related concepts distinct. */
  meaning: string
}

/**
 * Canonical noun → owner + meaning. Keyed by the public `$876.<resource>` name.
 * The meaning column is deliberately terse; its job is to make a collision
 * obvious when two nouns describe different entities.
 */
export const RESOURCE_MANIFEST = {
  // Core identity / platform (owned by @876/sdk + @876/admin)
  auth: { owner: 'core', meaning: 'login, register, session' },
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
  features: { owner: 'core', meaning: 'feature flags' },
  entitlements: {
    owner: 'core',
    meaning: 'org/user access to 876 apps (org→app subscriptions, NOT billing)',
  },
  locations: { owner: 'core', meaning: 'organization locations' },
  contacts: { owner: 'core', meaning: 'organization contacts' },
  departments: { owner: 'core', meaning: 'org departments' },
  employees: { owner: 'core', meaning: 'org employees' },
  roles: { owner: 'core', meaning: 'platform + courier roles (unified)' },
  permissions: { owner: 'core', meaning: 'permission catalog' },
  organizationMembers: { owner: 'core', meaning: 'org member roster' },
  appAssignments: { owner: 'core', meaning: 'per-member app assignment' },
  invites: { owner: 'core', meaning: 'membership invitations' },

  // Shared finance (owned by @876/billing)
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
  paymentProviders: { owner: 'billing', meaning: 'payment providers' },
  paymentTerms: { owner: 'billing', meaning: 'payment terms' },
  subscriptions: {
    owner: 'billing',
    meaning: 'commercial recurring agreements, NOT core org→app entitlements',
  },
  taxRates: { owner: 'billing', meaning: 'tax rates' },
  taxAuthorities: { owner: 'billing', meaning: 'tax authorities' },
  bankAccounts: { owner: 'billing', meaning: 'bank accounts' },
  bankTransactions: { owner: 'billing', meaning: 'bank transactions' },
  salespeople: { owner: 'billing', meaning: 'salespeople' },

  // Couriers (owned by @876/couriers)
  packages: { owner: 'couriers', meaning: 'courier packages' },
  branches: { owner: 'couriers', meaning: 'courier branches' },
  warehouses: { owner: 'couriers', meaning: 'courier warehouses' },
  mailboxes: { owner: 'couriers', meaning: 'courier mailboxes' },
  addresses: { owner: 'couriers', meaning: 'courier addresses' },

  // Shared infrastructure
  files: { owner: 'storage', meaning: 'stored files' },
  uploads: { owner: 'storage', meaning: 'upload sessions' },
  notes: { owner: 'widgets', meaning: 'widget notes' },
  collections: { owner: 'widgets', meaning: 'widget collections' },
} as const satisfies Record<string, ResourceOwnership>

export type CanonicalResource = keyof typeof RESOURCE_MANIFEST

/**
 * Known, deliberate disagreements between the composed surface and the
 * canonical ontology in `docs/platform-object-model.md`. Each entry is a real
 * collision the adversarial review of PR #254 surfaced: the same public noun
 * resolves to a *different logical entity* depending on app context, which is
 * exactly what a unified facade must not allow.
 *
 * These are recorded — not silently tolerated — so the debt is visible in code
 * and so the surface-contract test can assert the set does not *grow*. The
 * planned resolution (rename the core entitlement-plan catalog off the Billing
 * `products`/`subscriptions` nouns) is tracked in ADR-011.
 */
export const KNOWN_COLLISIONS = [
  {
    resource: 'products',
    canonicalOwner: 'billing',
    conflictingUse:
      'Enterprise/platform `$876.products` and Console `$876.products.admin` resolve to the Core entitlement-plan catalog (@876/admin.products), not the Billing commercial catalog.',
    plannedResolution:
      'Expose the core catalog as `$876.entitlementPlans` and keep `$876.products` exclusively Billing. See ADR-011.',
  },
  {
    resource: 'subscriptions',
    canonicalOwner: 'billing',
    conflictingUse:
      'Console `$876.subscriptions.admin` resolves to Core org→app entitlement subscriptions (@876/admin.subscriptions), duplicating `$876.entitlements.admin` under the Billing-reserved `subscriptions` noun.',
    plannedResolution:
      "Route Console's org→app subscription administration through `$876.entitlements.admin` only. See ADR-011.",
  },
] as const satisfies ReadonlyArray<{
  resource: CanonicalResource
  canonicalOwner: ServiceOwner
  conflictingUse: string
  plannedResolution: string
}>
