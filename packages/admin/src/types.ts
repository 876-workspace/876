export type AdminAppStatus = 'active' | 'inactive'
export type AdminAppKind = 'internal' | 'platform' | 'product' | 'external'

export type AdminUser = {
  object: 'user'
  id: string
  /** Name of the user's primary organization, if they belong to one. */
  company: string | null
  company_short_name: string | null
  company_logo: string | null
  workos_user_id: string
  stripe_customer_id: string | null
  email: string
  username: string | null
  email_verified: boolean
  first_name: string
  last_name: string
  middle_name: string | null
  avatar: string | null
  status: string
  platform_role: string | null
  banned: boolean
  banned_reason: string | null
  deleted_at: number | null
  deleted_by: string | null
  deletion_reason: string | null
  created_at: number
  updated_at: number
}

export type AdminUsernameAvailability = {
  object: 'username_availability'
  username: string
  available: boolean
  code: 'available' | 'invalid' | 'reserved' | 'taken'
  reason: string
}

export type AdminAuditEvent = {
  object: 'audit_event'
  id: string
  event: string
  source: string
  app_name: string
  app_id: string | null
  user_id: string | null
  path: string | null
  search: string | null
  referrer: string | null
  title: string | null
  request_id: string | null
  session_id: string | null
  distinct_id: string | null
  properties: Record<string, unknown>
  created_at: number
}

export type AdminConsumerProfile = {
  object: 'consumer_profile'
  id: string
  user_id: string
  email: string
  username: string | null
  first_name: string
  last_name: string
  middle_name: string | null
  nickname: string | null
  avatar: string | null
  gender: 'male' | 'female' | 'other' | null
  phone_number: string | null
  date_of_birth: string | null
  language: string | null
  timezone: string | null
  created_at: number
  updated_at: number
}

export type AdminConsumerProfileUpdateParams = Partial<
  Pick<
    AdminConsumerProfile,
    | 'first_name'
    | 'last_name'
    | 'middle_name'
    | 'nickname'
    | 'avatar'
    | 'gender'
    | 'phone_number'
    | 'date_of_birth'
    | 'language'
    | 'timezone'
  >
>

export type AdminDeletedConsumerProfile = {
  object: 'consumer_profile'
  id: string
  deleted: true
}

export type AdminConsumerContactUser = {
  object: 'user'
  id: string
  email: string
  username: string | null
  first_name: string
  last_name: string
  middle_name: string | null
  avatar: string | null
}

export type AdminConsumerContact = {
  object: 'user_contact'
  id: string
  owner_user_id: string
  contact_user_id: string
  contact_user: AdminConsumerContactUser
  nickname: string | null
  notes: string | null
  created_at: number
  updated_at: number
}

export type AdminAccount = {
  object: 'account'
  id: string
  provider_id: string
  provider_type: string
  created_at: number
  updated_at: number
}

export type AdminConsumerContactCreateParams = {
  contactUserId: string
  nickname?: string | null
  notes?: string | null
}

export type AdminConsumerContactUpdateParams = Partial<{
  nickname: string | null
  notes: string | null
}>

export type AdminDeletedConsumerContact = {
  object: 'user_contact'
  id: string
  deleted: true
}

export type AdminUserCreateParams = {
  email: string
  first_name: string
  last_name: string
  middle_name?: string | null
  username?: string | null
  email_verified?: boolean | null
  avatar?: string | null
  status?: string | null
  /** Enterprise only: create a new org with this name and add the user as owner. */
  organization_name?: string | null
}

export type AdminUserUpdateParams = Partial<
  Pick<
    AdminUser,
    | 'stripe_customer_id'
    | 'email'
    | 'username'
    | 'email_verified'
    | 'first_name'
    | 'last_name'
    | 'middle_name'
    | 'avatar'
    | 'status'
  >
>

export type AdminDeletedUser = {
  object: 'user'
  id: string
  deleted: boolean
}

export type AdminOrganization = {
  object: 'organization'
  id: string
  workos_organization_id: string | null
  name: string | null
  short_name: string | null
  doing_business_as: string | null
  // Business identity
  industry: string | null
  business_type: string | null
  registration_number: string | null
  trn: string | null
  nis_number: string | null
  gct_number: string | null
  tax_id: string | null
  incorporation_date: string | null
  slug: string
  status: string
  logo_url: string | null
  // Contact
  primary_phone: string | null
  primary_email: string | null
  fax: string | null
  website_url: string | null
  support_url: string | null
  primary_contact_user_id: string | null
  // Locale
  timezone: string | null
  language: string | null
  // Address
  address_line1: string | null
  address_line2: string | null
  city: string | null
  region_id: string | null
  country_code: string | null
  // Financial
  currency_code: string | null
  // Enrollment
  enrollment_completed_at: number | null
  metadata: Record<string, unknown> | null
  deleted_at: number | null
  deleted_by: string | null
  deletion_reason: string | null
  created_at: number
  updated_at: number
}

export type AdminOrganizationCreateParams = {
  workos_organization_id?: string | null
  /** Organization display name. Recommended but optional on the admin tier. */
  name?: string | null
  short_name?: string | null
  /** URL-safe unique identifier. Auto-generated from ID if omitted. */
  slug?: string | null
  status?: string | null
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
  metadata?: Record<string, unknown> | null
}

export type AdminOrganizationUpdateParams = Partial<
  Pick<
    AdminOrganization,
    | 'workos_organization_id'
    | 'name'
    | 'short_name'
    | 'doing_business_as'
    | 'industry'
    | 'business_type'
    | 'registration_number'
    | 'trn'
    | 'nis_number'
    | 'gct_number'
    | 'tax_id'
    | 'incorporation_date'
    | 'fax'
    | 'primary_contact_user_id'
    | 'timezone'
    | 'language'
    | 'slug'
    | 'status'
    | 'logo_url'
    | 'primary_phone'
    | 'primary_email'
    | 'website_url'
    | 'support_url'
    | 'address_line1'
    | 'address_line2'
    | 'city'
    | 'region_id'
    | 'country_code'
    | 'currency_code'
    | 'metadata'
  >
>

export type AdminOrgSetupParams = {
  organizationId: string
  name: string
  slug: string
  primaryPhone: string
  addressLine1: string
  city: string
  regionId: string
  countryCode: string
  currencyCode: string
  primaryEmail?: string | null
  websiteUrl?: string | null
  supportUrl?: string | null
  addressLine2?: string | null
}

export type AdminInviteToken = {
  object: 'invite_token'
  id: string
  organization_id: string
  email: string
  role: string
  status: string
  expires_at: number
  created_at: number
}

export type AdminInviteCreateParams = {
  email: string
  role?: string
}

export type AdminDeletedOrganization = {
  object: 'organization'
  id: string
  deleted: boolean
}

export type AdminApp = {
  object: 'app'
  id: string
  name: string
  slug: string
  feature_prefix: string
  organization_id: string | null
  client_id: string
  client_type: string
  app_kind: AdminAppKind
  status: AdminAppStatus
  allowed_redirect_uris: string[]
  allowed_logout_uris: string[]
  logo_url: string | null
  homepage_url: string | null
  type: string
  scopes_allowed: string[]
  created_at: number
  updated_at: number
}

export type AdminAppPublic = {
  object: 'app'
  name: string
  logo_url: string | null
  app_kind: AdminAppKind
}

export type AdminAppCreateParams = {
  name: string
  clientType: string
  status?: AdminAppStatus
  organizationId?: string | null
  appKind?: AdminAppKind
  redirectUris?: string[]
  homepageUrl?: string | null
  logoUrl?: string | null
  scopesAllowed?: string[]
}

export type AdminAppUpdateParams = Partial<{
  name: string
  logo_url: string | null
  homepage_url: string | null
  app_kind: AdminAppKind
  status: AdminAppStatus
  organization_id: string | null
}>

export type AdminAppCreated = AdminApp & {
  /** Plaintext client secret, returned once at creation for confidential clients. */
  clientSecret: string | null
}

export type AdminDeletedApp = {
  object: 'app'
  id: string
  deleted: boolean
}

export type AdminProvisioningTargetType = ProvisioningTargetType
export type AdminProvisioningValueType = ProvisioningValueType
export type AdminProvisioningProperty = ProvisioningProperty
export type AdminProvisioningResource = ProvisioningResource
export type AdminProvisioningStep = ProvisioningStep
export type AdminProvisioningManifestRevision = ProvisioningManifestRevision
export type AdminProvisioningManifest = ProvisioningManifest
export type AdminProvisioningDraftReplaceParams = ProvisioningDraftReplaceParams
export type AdminProvisioningValidation = ProvisioningValidation
export type AdminProvisioningCatalog = ProvisioningCatalog
export type AdminProvisioningNote = ProvisioningNote
export type AdminProvisioningRun = ProvisioningRun
export type AdminProvisioningRunStatus = ProvisioningRunStatus
export type AdminProvisioningReconciliationResult =
  ProvisioningReconciliationResult

export type AdminDeletedProvisioningNote = {
  object: 'provisioning_note'
  id: string
  deleted: true
}

export type AdminApiKey = {
  object: 'api_key'
  id: string
  app_id: string
  name: string | null
  revoked: boolean
  expires_at: number | null
  last_used_at: number | null
  created_at: number
}

export type AdminApiKeyCreated = AdminApiKey & {
  key: string
}

export type AdminDeletedApiKey = {
  object: 'api_key'
  id: string
  deleted: boolean
}

export type AdminApiKeyCreateParams = {
  name?: string
  expires_at?: number
}

export type AdminApiKeyUpdateParams = {
  name?: string | null
}

export type AdminMembership = {
  object: 'membership'
  id: string
  organization_id: string
  user_id: string
  workos_membership_id: string | null
  role: string
  role_id: string | null
  status: string
  created_at: number
  updated_at: number
}

export type AdminMembershipCreateParams = {
  organization_id: string
  user_id: string
  role?: string
  status?: string
}

export type AdminMembershipUpdateParams = Partial<{
  role: string
  status: string
  workos_membership_id: string | null
}>

export type AdminDeletedMembership = {
  object: 'membership'
  id: string
  deleted: boolean
}

export type AdminRoutingMembership = {
  id: string
  role: string
  status: string
  /** Effective org permissions for this membership (resource:action strings). */
  permissions: string[]
  organization: {
    id: string
    name: string | null
    slug: string
    status: string
  }
}

export type AdminFeature = {
  object: 'feature'
  id: string
  provider: string
  provider_feature_id: string | null
  provider_environment_id: string | null
  slug: string
  name: string
  description: string | null
  tags: string[]
  enabled: boolean
  default_value: boolean
  value_type: string | null
  value: unknown
  server_side_only: boolean
  archived_at: number | null
  parent_feature_id: string | null
  provider_metadata: Record<string, unknown> | null
  consumer_default_enabled: boolean
  scope: string
  app_id: string | null
  synced_at: number
  created_at: number
  updated_at: number
}

export type AdminFeatureCreateParams = {
  name: string
  slug?: string
  description?: string | null
  default_enabled?: boolean
  scope?: string
  consumer_default_enabled?: boolean
  default_value?: boolean | null
  value_type?: string | null
  value?: unknown
  tags?: string[]
  server_side_only?: boolean
  parent_feature_id?: string | null
  app_id: string | null
}

export type AdminFeatureUpdateParams = {
  description?: string | null
  enabled?: boolean
  app_id?: string | null
  tags?: string[]
  consumer_default_enabled?: boolean
  scope?: string
  default_value?: boolean
  value_type?: string | null
  value?: unknown
  server_side_only?: boolean
  archived?: boolean
  parent_feature_id?: string | null
}

export type AdminFeatureSearchParams = {
  query: string
  limit?: number
  appId?: string
}

export type AdminDeletedFeature = {
  object: 'feature'
  id: string
  deleted: true
}

export type AdminUserFeature = {
  object: 'user_feature'
  id: string
  user_id: string
  feature_id: string
  slug: string
  status: string
  note: string | null
  synced_at: number | null
  created_at: number
  updated_at: number
}

export type AdminUserFeatureGrantParams = {
  feature_id: string
  enabled?: boolean
  note?: string | null
}

export type AdminUserFeatureUpdateParams = {
  enabled?: boolean
  note?: string | null
}

export type AdminDeletedUserFeature = {
  object: 'user_feature'
  id: string
  deleted: true
}

export type AdminOrgFeature = {
  object: 'org_feature'
  id: string
  organization_id: string
  feature_id: string
  slug: string
  status: string
  note: string | null
  synced_at: number
  created_at: number
  updated_at: number
}

export type AdminOrgFeatureGrantParams = {
  feature_id: string
  enabled?: boolean
  note?: string | null
}

export type AdminOrgFeatureUpdateParams = {
  enabled?: boolean
  note?: string | null
}

export type AdminDeletedOrgFeature = {
  object: 'org_feature'
  id: string
  deleted: true
}

export type AdminFeatureEvaluateParams = {
  userId?: string
  organizationId?: string
  appId?: string
  appSlug?: string
}

export type AdminUserApp = {
  object: 'app'
  id: string
  name: string
  slug: string
  logo_url: string | null
  homepage_url: string | null
  app_kind: 'internal' | 'platform' | 'product' | 'external'
  status: string
  enrolled_at: number
  last_seen_at: number
}

export type AdminOAuthGrant = {
  id: string
  appId: string
  name: string
  clientId: string
  logoUrl: string | null
  homepageUrl: string | null
  scopes: string[]
  createdAt: number
  updatedAt: number
}

export type AdminListResponse<T> = {
  object: 'list'
  data: T[]
  has_more: boolean
  url: string
  total_count: number | null
}

export type AdminSearchResponse<T> = Omit<AdminListResponse<T>, 'object'> & {
  object: 'search_result'
}

export type AdminAddress = {
  object: 'address'
  id: string
  user_id: string | null
  organization_id: string | null
  type: 'billing' | 'shipping' | 'home' | 'work' | 'other'
  label: string | null
  line1: string | null
  line2: string | null
  city: string | null
  region_id: string | null
  country_code: string | null
  postal_code: string | null
  is_default: boolean
  created_at: number
  updated_at: number
}

export type AdminAddressCreateParams = {
  userId?: string | null
  organizationId?: string | null
  type?: 'billing' | 'shipping' | 'home' | 'work' | 'other'
  label?: string | null
  line1?: string | null
  line2?: string | null
  city?: string | null
  regionId?: string | null
  countryCode?: string | null
  postalCode?: string | null
  isDefault?: boolean
}

export type AdminAddressUpdateParams = Partial<{
  type: 'billing' | 'shipping' | 'home' | 'work' | 'other'
  label: string | null
  line1: string | null
  line2: string | null
  city: string | null
  region_id: string | null
  country_code: string | null
  postal_code: string | null
  is_default: boolean
}>

export type AdminDeletedAddress = {
  object: 'address'
  id: string
  deleted: true
}

export type ReservedUsername = {
  object: 'reserved_username'
  username: string
  reason: string | null
  created_at: number
}

export type ReservedUsernameCreateParams = {
  username: string
  reason?: string | null
}

export type DeletedReservedUsername = {
  object: 'reserved_username'
  username: string
  deleted: true
}

export type UnlinkedAccount = {
  object: 'account'
  id: string
  deleted: true
}

export type SessionRevoke = {
  object: 'session_revoke'
  user_id: string
  sessions_revoked: number
}

export type AdminBillingAccount = {
  object: 'billing_account'
  id: string
  organization_id: string
  name: string | null
  email: string | null
  invoice_email: string | null
  currency: string | null
  tax_exempt: string | null
  balance: number
  default_payment_method_id: string | null
  invoice_settings: Record<string, unknown> | null
  preferred_locales: Record<string, unknown> | null
  address: Record<string, unknown> | null
  shipping: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  created_at: number
  updated_at: number
}

export type AdminBillingAccountCreateParams = {
  organization_id: string
  name?: string | null
  email?: string | null
  invoice_email?: string | null
  currency?: string | null
  tax_exempt?: string | null
  balance?: number
  default_payment_method_id?: string | null
  invoice_settings?: Record<string, unknown> | null
  preferred_locales?: Record<string, unknown> | null
  address?: Record<string, unknown> | null
  shipping?: Record<string, unknown> | null
  metadata?: Record<string, unknown> | null
}

export type AdminBillingAccountUpdateParams = Partial<
  Omit<AdminBillingAccountCreateParams, 'organization_id'>
>

export type AdminDeletedBillingAccount = {
  object: 'billing_account'
  id: string
  deleted: true
}

export type AdminSubscriptionStatus =
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'paused'
  | 'blocked'

export type AdminSubscriptionItem = {
  object: 'subscription_item'
  id: string
  price_id: string
  product_id: string | null
  product_slug: string | null
  product_name: string | null
  quantity: number
  billing_thresholds: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
}

export type AdminSubscriptionItemCreateParams = {
  price_id: string
  quantity?: number
  metadata?: Record<string, unknown> | null
}

export type AdminSubscriptionItemUpdateParams = Partial<
  Omit<AdminSubscriptionItemCreateParams, 'price_id'>
>

export type AdminDeletedSubscriptionItem = {
  object: 'subscription_item'
  id: string
  deleted: true
}

export type AdminSubscription = {
  object: 'subscription'
  id: string
  billing_account_id: string | null
  organization_id: string
  app_id: string
  app_slug: string | null
  app_name: string | null
  app_logo_url: string | null
  app_kind: 'internal' | 'platform' | 'product' | 'external' | null
  status: AdminSubscriptionStatus
  provider_status: string | null
  status_reason: string | null
  finance_lifecycle_version: number
  collection_method: string
  billing_cycle_anchor: number | null
  items: AdminSubscriptionItem[]
  current_period_start: number | null
  current_period_end: number | null
  cancel_at: number | null
  cancel_at_period_end: boolean
  canceled_at: number | null
  ended_at: number | null
  pause_collection: Record<string, unknown> | null
  trial_start: number | null
  trial_end: number | null
  start_date: number | null
  default_payment_method_id: string | null
  latest_invoice_id: string | null
  pending_update: Record<string, unknown> | null
  schedule_id: string | null
  metadata: Record<string, unknown> | null
  created_at: number
  updated_at: number
}

export type AdminSubscriptionCreateParams = {
  billing_account_id?: string | null
  organization_id: string
  app_id: string
  price_id?: string | null
  status?: AdminSubscriptionStatus
  collection_method?: string
  cancel_at_period_end?: boolean
  metadata?: Record<string, unknown> | null
}

export type AdminSubscriptionUpdateParams = Partial<
  Omit<AdminSubscriptionCreateParams, 'organization_id' | 'app_id'>
>

export type AdminDeletedSubscription = {
  object: 'subscription'
  id: string
  deleted: true
}

export type AdminPrice = {
  object: 'price'
  id: string
  product_id: string
  unit_amount: number
  currency: string
  /** Recurring billing interval. Null for a price with no recurring charge. */
  billing_interval: 'month' | 'year' | null
  interval_count: number | null
  status: 'active' | 'archived'
  active: boolean
  lookup_key: string | null
  name: string | null
  nickname: string | null
  type: string
  billing_scheme: string
  tiers_mode: string | null
  tiers: Record<string, unknown> | null
  recurring: Record<string, unknown> | null
  tax_behavior: string | null
  transform_quantity: Record<string, unknown> | null
  unit_amount_decimal: string | null
  trial_period_days: number | null
  metadata: Record<string, unknown> | null
  archived_at: number | null
  created_at: number
  updated_at: number
}

export type AdminPriceCreateParams = {
  unit_amount?: number
  currency?: string
  billing_interval?: 'month' | 'year' | null
  interval_count?: number | null
  name?: string
  nickname?: string
}

export type AdminPriceUpdateParams = {
  name?: string
  nickname?: string
  active?: boolean
  metadata?: Record<string, unknown>
}

export type AdminProduct = {
  object: 'product'
  id: string
  slug: string
  name: string
  description: string | null
  /** ID of the app this product is scoped to. Null for platform-wide products. */
  app_id: string | null
  app_slug: string | null
  app_name: string | null
  app_logo_url: string | null
  app_kind: 'internal' | 'platform' | 'product' | 'external' | null
  status: 'active' | 'archived'
  active: boolean
  statement_descriptor: string | null
  unit_label: string | null
  tax_code_id: string | null
  lookup_key: string | null
  metadata: Record<string, unknown> | null
  archived_at: number | null
  prices: AdminPrice[]
  /** Durable application modules included in this plan. */
  module_ids: string[]
  created_at: number
  updated_at: number
}

export type AdminProductCreateParams = {
  slug: string
  name: string
  description?: string | null
  app_id?: string | null
  tax_code_id?: string | null
  module_ids?: string[]
  price: AdminPriceCreateParams
}

export type AdminProductModulesReplaceParams = {
  module_ids: string[]
}

export type AdminApplicationModule = {
  object: 'application_module'
  id: string
  app_id: string
  key: string
  name: string
  description: string | null
  feature_id: string | null
  feature_slug: string | null
  status: 'active' | 'archived'
  position: number
  created_at: number
  updated_at: number
}

export type AdminApplicationModuleCreateParams = {
  app_id: string
  key: string
  name: string
  description?: string | null
  feature_id?: string | null
  position?: number
}

export type AdminApplicationModuleUpdateParams = Partial<{
  name: string
  description: string | null
  feature_id: string | null
  status: 'active' | 'archived'
  position: number
}>

export type AdminDeletedApplicationModule = {
  object: 'application_module'
  id: string
  deleted: true
}

export type AdminProductUpdateParams = Partial<{
  slug: string
  name: string
  description: string | null
  active: boolean
  tax_code_id: string | null
}>

export type AdminDeletedProduct = {
  object: 'product'
  id: string
  deleted: true
}

export type AdminSubscriptionBatch = {
  object: 'list'
  data: AdminSubscription[]
  total_count: number
}

export type AdminOrgRole = {
  object: 'organization_role'
  id: string
  organization_id: string
  name: string
  display_name: string
  description: string | null
  permissions: string[]
  /** True for default roles seeded at org creation; immutable through the API. */
  is_system: boolean
  members_count: number | null
  created_at: number
  updated_at: number
}

export type AdminOrgRoleCreateParams = {
  name: string
  display_name: string
  description?: string | null
  permissions: string[]
}

export type AdminOrgRoleUpdateParams = Partial<{
  display_name: string
  description: string | null
  permissions: string[]
}>

export type AdminDeletedOrgRole = {
  object: 'organization_role'
  id: string
  deleted: true
}

export type AdminPermissionCatalog = {
  object: 'permission_catalog'
  groups: { name: string; permissions: string[] }[]
}

export type AdminOrgMember = {
  object: 'organization_member'
  id: string
  user_id: string
  role: string
  role_id: string | null
  status: string
  first_name: string | null
  last_name: string | null
  email: string | null
  avatar: string | null
  created_at: number
}

export type AdminAppAssignment = {
  object: 'app_assignment'
  id: string
  organization_id: string
  user_id: string
  app_id: string
  app_slug: string | null
  app_name: string | null
  status: string
  /** User ID of the member who granted access. Null for system grants. */
  assigned_by: string | null
  created_at: number
  updated_at: number
}

export type AdminAppAssignmentCreateParams = {
  user_id: string
  app_id?: string
  app_slug?: string
}

export type AdminOrgLocation = {
  object: 'org_location'
  id: string
  organization_id: string
  name: string
  code: string | null
  type: string
  status: string
  is_primary: boolean
  phone: string | null
  email: string | null
  line1: string | null
  line2: string | null
  city: string | null
  region_id: string | null
  country_code: string | null
  postal_code: string | null
  timezone: string | null
  metadata: Record<string, unknown> | null
  deleted_at: number | null
  deleted_by: string | null
  deletion_reason: string | null
  created_at: number
  updated_at: number
}

export type AdminOrgLocationCreateParams = {
  name: string
  code?: string | null
  type?: string
  status?: string
  is_primary?: boolean
  phone?: string | null
  email?: string | null
  line1?: string | null
  line2?: string | null
  city?: string | null
  region_id?: string | null
  country_code?: string | null
  postal_code?: string | null
  timezone?: string | null
  metadata?: Record<string, unknown> | null
}

export type AdminOrgLocationUpdateParams = Partial<AdminOrgLocationCreateParams>

export type AdminDeletedOrgLocation = {
  object: 'org_location'
  id: string
  deleted: true
}

export type AdminOrgContact = {
  object: 'org_contact'
  id: string
  organization_id: string
  /** Platform user ID when the contact is an org member; null for external contacts. */
  user_id: string | null
  first_name: string
  last_name: string | null
  title: string | null
  type: string
  is_primary: boolean
  email: string | null
  phone: string | null
  mobile: string | null
  notes: string | null
  metadata: Record<string, unknown> | null
  deleted_at: number | null
  deleted_by: string | null
  deletion_reason: string | null
  created_at: number
  updated_at: number
}

export type AdminOrgContactCreateParams = {
  first_name: string
  /** Link the contact to a platform user (must be an active org member). */
  user_id?: string | null
  last_name?: string | null
  title?: string | null
  type?: string
  is_primary?: boolean
  email?: string | null
  phone?: string | null
  mobile?: string | null
  notes?: string | null
  metadata?: Record<string, unknown> | null
}

export type AdminOrgContactUpdateParams = Partial<AdminOrgContactCreateParams>

export type AdminDeletedOrgContact = {
  object: 'org_contact'
  id: string
  deleted: true
}

export type AdminOrgDepartment = {
  object: 'org_department'
  id: string
  organization_id: string
  name: string
  code: string | null
  description: string | null
  parent_department_id: string | null
  head_membership_id: string | null
  status: string
  metadata: Record<string, unknown> | null
  deleted_at: number | null
  deleted_by: string | null
  deletion_reason: string | null
  created_at: number
  updated_at: number
}

export type AdminOrgDepartmentCreateParams = {
  name: string
  code?: string | null
  description?: string | null
  parent_department_id?: string | null
  head_membership_id?: string | null
  status?: string
  metadata?: Record<string, unknown> | null
}

export type AdminOrgDepartmentUpdateParams =
  Partial<AdminOrgDepartmentCreateParams>

export type AdminDeletedOrgDepartment = {
  object: 'org_department'
  id: string
  deleted: true
}

export type AdminEmployeeProfile = {
  object: 'employee_profile'
  id: string
  membership_id: string
  organization_id: string
  user_id: string | null
  employee_number: string | null
  job_title: string | null
  department_id: string | null
  location_id: string | null
  manager_membership_id: string | null
  employment_type: string | null
  employment_status: string
  division: string | null
  cost_center: string | null
  work_email: string | null
  work_phone: string | null
  start_date: number | null
  end_date: number | null
  metadata: Record<string, unknown> | null
  deleted_at: number | null
  deleted_by: string | null
  deletion_reason: string | null
  created_at: number
  updated_at: number
}

export type AdminEmployeeProfileCreateParams = {
  membership_id: string
  employee_number?: string | null
  job_title?: string | null
  department_id?: string | null
  location_id?: string | null
  manager_membership_id?: string | null
  employment_type?: string | null
  employment_status?: string
  division?: string | null
  cost_center?: string | null
  work_email?: string | null
  work_phone?: string | null
  start_date?: number | null
  end_date?: number | null
  metadata?: Record<string, unknown> | null
}

export type AdminEmployeeProfileUpdateParams = Partial<
  Omit<AdminEmployeeProfileCreateParams, 'membership_id'>
>

export type AdminDeletedEmployeeProfile = {
  object: 'employee_profile'
  id: string
  deleted: true
}

export type AdminResult<T> =
  | { data: T; error: null }
  | { data: null; error: { code: string; message: string } }

export type Admin876ClientOptions = {
  /** Base URL of the 876 API. Defaults to env, local dev, or the deployed API URL. */
  baseUrl?: string
  /** Server-side admin key. Never expose this value to browser code. */
  internalKey?: string
  /** API key for approved privileged requests. */
  apiKey?: string
  /** Request ID to forward to the API for cross-service log correlation. */
  requestId?: string
  /** Optional fetch implementation, useful for tests or custom runtimes. */
  fetch?: typeof fetch
}
import type {
  ProvisioningCatalog,
  ProvisioningDraftReplaceParams,
  ProvisioningManifest,
  ProvisioningManifestRevision,
  ProvisioningNote,
  ProvisioningReconciliationResult,
  ProvisioningProperty,
  ProvisioningResource,
  ProvisioningRun,
  ProvisioningRunStatus,
  ProvisioningStep,
  ProvisioningTargetType,
  ProvisioningValidation,
  ProvisioningValueType,
} from '@876/core/types/provisioning'
