/**
 * Type contracts for `@876/core/platform` — the narrow, server-only platform
 * bootstrap client for first-party product apps. See `./index.ts` for the
 * client factory and `.claude/rules/sdk-conventions.md` for the naming
 * vocabulary these types follow.
 *
 * @module @876/core/platform/types
 */
import type {
  ProvisioningManifestRevision,
  ProvisioningProperty,
  ProvisioningRun,
} from '../types/provisioning'

/** A user row as returned by the internal-key user lookups. */
export type PlatformUser = {
  id: string
  workos_user_id: string
  email: string
  first_name: string | null
  last_name: string | null
  avatar: string | null
  role: string | null
  permissions: string[] | null
  status: string | null
  banned: boolean | null
}

/** A routing membership row (`/auth/routing/memberships`). */
export type PlatformRoutingMembership = {
  id: string
  role: string
  status: string
  organization: {
    id: string
    name: string | null
    slug: string
    status: string
  }
}

/** A membership row (`/memberships`). */
export type PlatformMembership = {
  object: 'membership'
  id: string
  organization_id: string
  user_id: string
  role: string
  role_id: string | null
  status: string
  created_at: number
  updated_at: number
}

/** An organization row, narrowed to the fields product apps consume. */
export type PlatformOrganization = {
  object: 'organization'
  id: string
  name: string | null
  slug: string
  status: string
  logo_url: string | null
  timezone: string | null
  language: string | null
  country_code: string | null
  currency_code: string | null
  created_at: number
  updated_at: number
}

/**
 * An organization's full identity profile, as returned by the session-scoped
 * `GET`/`PATCH /organizations/{id}/profile` endpoints. This is the surface a
 * product app (e.g. Couriers) reads to prefill, and writes from, its org
 * settings form. Privileged fields (status, slug, WorkOS id, metadata) are not
 * writable through this profile surface.
 */
export type PlatformOrganizationProfile = {
  object: 'organization'
  id: string
  name: string | null
  short_name: string | null
  doing_business_as: string | null
  slug: string
  status: string
  logo_url: string | null
  industry: string | null
  business_type: string | null
  registration_number: string | null
  trn: string | null
  nis_number: string | null
  gct_number: string | null
  tax_id: string | null
  incorporation_date: string | null
  primary_phone: string | null
  primary_email: string | null
  fax: string | null
  website_url: string | null
  support_url: string | null
  primary_contact_user_id: string | null
  timezone: string | null
  language: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  region_id: string | null
  country_code: string | null
  currency_code: string | null
  created_at: number
  updated_at: number
}

/** The editable fields of an org profile. All optional; `null` clears a field. */
export type PlatformOrgProfileUpdateParams = {
  name?: string | null
  short_name?: string | null
  doing_business_as?: string | null
  industry?: string | null
  business_type?: string | null
  registration_number?: string | null
  trn?: string | null
  nis_number?: string | null
  gct_number?: string | null
  tax_id?: string | null
  incorporation_date?: string | null
  fax?: string | null
  primary_contact_user_id?: string | null
  timezone?: string | null
  language?: string | null
  logo_url?: string | null
  primary_phone?: string | null
  primary_email?: string | null
  website_url?: string | null
  support_url?: string | null
  address_line1?: string | null
  address_line2?: string | null
  city?: string | null
  region_id?: string | null
  country_code?: string | null
  currency_code?: string | null
}

/** An org→app subscription row, narrowed to the fields product apps consume. */
export type PlatformSubscription = {
  object: 'subscription'
  id: string
  organization_id: string
  app_id: string
  app_slug: string | null
  app_name: string | null
  status: string
  items: Array<{
    id: string
    price_id: string
    product_id: string | null
    quantity: number
  }>
  created_at: number
  updated_at: number
}

/** An organization invite token. */
export type PlatformInviteToken = {
  object: 'invite_token'
  id: string
  organization_id: string
  email: string
  role: string | null
  status: 'pending' | 'accepted' | 'expired' | 'revoked'
  expires_at: number
  source_app_id: string | null
  created_at: number
}

/** A region (parish/state/province) row for a country (`/geo/countries/{code}/regions`). */
export type PlatformRegion = {
  id: string
  country_code: string
  code: string
  name: string
  type: string
  is_enabled: boolean
}

/** A feature evaluation row (`/features/evaluate`). */
export type PlatformFeature = {
  id: string
  slug: string
  enabled: boolean
}

export type PlatformProvisioningProperty = ProvisioningProperty
export type PlatformProvisioningRevision = ProvisioningManifestRevision
export type PlatformProvisioningRun = ProvisioningRun

/** The kind of resource targeted by an onboarding catalog. */
export type PlatformOnboardingTargetType = 'organization' | 'application'

/** A selectable onboarding field option. */
export type PlatformOnboardingOption = {
  value: string
  label: string
}

/** A condition that makes an onboarding field required. */
export type PlatformOnboardingCondition = {
  field_key: string
  equals: unknown
}

/** A field in an onboarding catalog. */
export type PlatformOnboardingField = {
  key: string
  label: string
  description: string | null
  field_type: string
  required: boolean
  sensitive: boolean
  placeholder: string | null
  pattern: string | null
  min_items: number | null
  required_when: PlatformOnboardingCondition | null
  options: PlatformOnboardingOption[]
  item_fields: PlatformOnboardingField[]
}

/** A section in an onboarding catalog. */
export type PlatformOnboardingSection = {
  key: string
  title: string
  description: string
  position: number
  fields: PlatformOnboardingField[]
}

/** The onboarding catalog for an organization or application target. */
export type PlatformOnboardingCatalog = {
  object: 'onboarding_catalog'
  target_type: PlatformOnboardingTargetType
  target_key: string
  country_code: string
  schema_version: 1
  catalog_revision: number
  sections: PlatformOnboardingSection[]
}

/** An organization's saved onboarding answers and lifecycle state. */
export type PlatformOnboardingSession = {
  object: 'onboarding_session'
  id: string
  organization_id: string
  target_type: PlatformOnboardingTargetType
  target_key: string
  country_code: string
  schema_version: 1
  catalog_revision: number
  status: 'draft' | 'submitted' | 'completed' | 'needs_update'
  answers: Record<string, unknown>
  submitted_at: number | null
  completed_at: number | null
  created_at: number
  updated_at: number
}

/** A single onboarding validation failure. */
export type PlatformOnboardingValidationIssue = {
  path: string
  code: string
  message: string
}

/** The result of validating onboarding answers. */
export type PlatformOnboardingValidation = {
  object: 'onboarding_validation'
  valid: boolean
  issues: PlatformOnboardingValidationIssue[]
}

/** A user feature grant row (`/users/{id}/features`). */
export type PlatformUserFeature = {
  id: string
  slug: string
  status: string
}

/**
 * A sensitive verified identifier on a user account (Jamaican TRN, passport,
 * driver's license). Per `.claude/rules/customer-architecture.md`, this is
 * identity data owned by the core API — `value_masked` is always what's
 * returned here; the full value is only ever returned by
 * `users.identifications.disclose()`.
 */
export type PlatformUserIdentification = {
  object: 'user_identification'
  id: string
  user_id: string
  type: string
  label: string
  country_code: string | null
  value_masked: string
  verified: boolean
  verified_at: number | null
  created_at: number
  updated_at: number
}

export type PlatformUserIdentificationCreateParams = {
  type: string
  value: string
  countryCode?: string | null
}

export type PlatformUserIdentificationUpdateParams = {
  value: string
  countryCode?: string | null
}

export type PlatformDeletedUserIdentification = {
  object: 'user_identification'
  id: string
  deleted: true
}

export type PlatformUserIdentificationDiscloseParams = {
  organizationId: string
  appSlug: string
  reason?: string | null
}

/** The full, unmasked value. Only ever returned by `disclose()`. */
export type PlatformUserIdentificationDisclosure = {
  object: 'user_identification_disclosure'
  type: string
  value: string
  country_code: string | null
  verified: boolean
  disclosed_at: number
}

/** The standard list envelope returned by platform list endpoints. */
export type PlatformList<T> = {
  object: 'list'
  data: T[]
  has_more: boolean
  url: string
  total_count: number | null
}

/**
 * Options for `create876PlatformClient`.
 *
 * @property baseUrl - API base URL; defaults to `API_URL` (then the public
 *   URL fallbacks) from the environment.
 * @property internalKey - The `x-internal-key` secret; defaults to
 *   `API_INTERNAL_KEY`. Server-only — never expose to the browser.
 * @property apiKey - The app's `876_app_secret_*` key sent alongside the
 *   internal key (the API's global api-key gate rejects internal-key-only
 *   requests).
 * @property requestId - Optional per-request correlation id forwarded as
 *   `x-request-id`.
 */
export type Platform876ClientOptions = {
  baseUrl?: string
  internalKey?: string
  apiKey?: string
  requestId?: string
  fetch?: typeof fetch
}
