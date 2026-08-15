import type { CursorPageParams } from '@876/core/client'

export type AdminAppStatus = 'active' | 'inactive'
export type AdminAppKind = 'internal' | 'platform' | 'product' | 'external'

export type AdminPhoneLookup = {
  object: 'phone_lookup'
  valid: boolean
  e164: string | null
  nationalFormat: string | null
  countryCode: string | null
  carrierName: string | null
  lineType: string | null
  mobileCountryCode: string | null
  mobileNetworkCode: string | null
  lineTypeRequested: boolean
  createdAt: number
}

export type AdminPhoneLookupCreateParams = {
  number: string
  includeLineType?: boolean
}

export type AdminCommunicationMessage = {
  object: 'communication_message'
  id: string
  provider: string
  providerSid: string | null
  channel: 'sms' | 'whatsapp'
  direction: string
  status: string
  toNumber: string
  fromNumber: string | null
  messagingServiceSid: string | null
  contentSid: string | null
  templateKey: string | null
  bodyPreview: string | null
  bodyHash: string
  userId: string | null
  organizationId: string | null
  appId: string | null
  clientReference: string | null
  idempotencyKey: string
  providerErrorCode: string | null
  sentAt: number | null
  deliveredAt: number | null
  readAt: number | null
  failedAt: number | null
  createdAt: number
  updatedAt: number
}

export type AdminCommunicationMessageCreateParams = {
  toNumber: string
  channel: 'sms' | 'whatsapp'
  templateKey: string
  idempotencyKey: string
  userId?: string | null
  organizationId?: string | null
  appId?: string | null
  clientReference?: string | null
}

export type AdminCommunicationCall = {
  object: 'communication_call'
  id: string
  provider: string
  providerSid: string | null
  direction: string
  status: string
  toNumber: string
  fromNumber: string | null
  templateKey: string
  userId: string | null
  organizationId: string | null
  appId: string | null
  clientReference: string | null
  idempotencyKey: string
  durationSeconds: number | null
  providerErrorCode: string | null
  startedAt: number | null
  answeredAt: number | null
  completedAt: number | null
  createdAt: number
  updatedAt: number
}

export type AdminCommunicationCallCreateParams = {
  toNumber: string
  templateKey: string
  idempotencyKey: string
  userId?: string | null
  organizationId?: string | null
  appId?: string | null
  clientReference?: string | null
}

export type AdminCommunicationListParams = CursorPageParams & {
  status?: string
}

export type AdminUser = {
  object: 'user'
  id: string
  /** Name of the user's primary organization, if they belong to one. */
  company: string | null
  companyShortName: string | null
  companyLogo: string | null
  workosUserId: string
  stripeCustomerId: string | null
  email: string
  username: string | null
  emailVerified: boolean
  firstName: string
  lastName: string
  middleName: string | null
  avatar: string | null
  avatarFileId: string | null
  status: string
  platformRole: string | null
  banned: boolean
  bannedReason: string | null
  deletedAt: number | null
  deletedBy: string | null
  deletionReason: string | null
  createdAt: number
  updatedAt: number
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
  appName: string
  appId: string | null
  userId: string | null
  path: string | null
  search: string | null
  referrer: string | null
  title: string | null
  requestId: string | null
  sessionId: string | null
  distinctId: string | null
  properties: Record<string, unknown>
  createdAt: number
}

export type AdminConsumerProfile = {
  object: 'consumer_profile'
  id: string
  userId: string
  email: string
  username: string | null
  firstName: string
  lastName: string
  middleName: string | null
  nickname: string | null
  avatar: string | null
  avatarFileId: string | null
  gender: 'male' | 'female' | 'other' | null
  phoneNumber: string | null
  dateOfBirth: string | null
  language: string | null
  timezone: string | null
  createdAt: number
  updatedAt: number
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
  firstName: string
  lastName: string
  middleName: string | null
  avatar: string | null
  avatarFileId: string | null
}

export type AdminConsumerContact = {
  object: 'user_contact'
  id: string
  ownerUserId: string
  contactUserId: string
  contactUser: AdminConsumerContactUser
  nickname: string | null
  notes: string | null
  createdAt: number
  updatedAt: number
}

export type AdminAccount = {
  object: 'account'
  id: string
  providerId: string
  providerType: string
  createdAt: number
  updatedAt: number
}

/**
 * A sensitive verified identifier on a user account (Jamaican TRN, passport,
 * driver's license). Identity data per `.claude/rules/customer-architecture.md`
 * — the value is always masked here; the full value is only ever returned by
 * `disclose()`.
 */
export type AdminUserIdentification = {
  object: 'user_identification'
  id: string
  userId: string
  type: string
  label: string
  countryCode: string | null
  valueMasked: string
  verified: boolean
  verifiedAt: number | null
  createdAt: number
  updatedAt: number
}

export type AdminUserIdentificationCreateParams = {
  type: string
  value: string
  countryCode?: string | null
}

export type AdminUserIdentificationUpdateParams = {
  value: string
  countryCode?: string | null
}

export type AdminDeletedUserIdentification = {
  object: 'user_identification'
  id: string
  deleted: true
}

export type AdminUserIdentificationDiscloseParams = {
  organizationId: string
  appSlug: string
  reason?: string | null
}

/** The full, unmasked value. Only ever returned by `disclose()`. */
export type AdminUserIdentificationDisclosure = {
  object: 'user_identification_disclosure'
  type: string
  value: string
  countryCode: string | null
  verified: boolean
  disclosedAt: number
}

export type AdminUserIdentificationVerifyParams = {
  verifiedBy: string
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
  firstName: string
  lastName: string
  middleName?: string | null
  username?: string | null
  emailVerified?: boolean | null
  avatar?: string | null
  status?: string | null
  /** Enterprise only: create a new org with this name and add the user as owner. */
  organizationName?: string | null
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
    | 'avatar_file_id'
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
  workosOrganizationId: string | null
  name: string | null
  shortName: string | null
  doingBusinessAs: string | null
  // Business identity
  industry: string | null
  businessType: string | null
  registrationNumber: string | null
  trn: string | null
  nisNumber: string | null
  gctNumber: string | null
  taxId: string | null
  incorporationDate: string | null
  slug: string
  status: string
  logoUrl: string | null
  logoFileId: string | null
  // Contact
  primaryPhone: string | null
  primaryEmail: string | null
  fax: string | null
  websiteUrl: string | null
  supportUrl: string | null
  primaryContactUserId: string | null
  // Locale
  timezone: string | null
  language: string | null
  // Address
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  regionId: string | null
  countryCode: string | null
  // Financial
  currencyCode: string | null
  // Enrollment
  enrollmentCompletedAt: number | null
  metadata: Record<string, unknown> | null
  deletedAt: number | null
  deletedBy: string | null
  deletionReason: string | null
  createdAt: number
  updatedAt: number
}

export type AdminOrganizationCreateParams = {
  workosOrganizationId?: string | null
  /** Organization display name. Recommended but optional on the admin tier. */
  name?: string | null
  shortName?: string | null
  /** URL-safe unique identifier. Auto-generated from ID if omitted. */
  slug?: string | null
  status?: string | null
  primaryPhone?: string | null
  primaryEmail?: string | null
  websiteUrl?: string | null
  supportUrl?: string | null
  addressLine1?: string | null
  addressLine2?: string | null
  city?: string | null
  regionId?: string | null
  countryCode?: string | null
  currencyCode?: string | null
  doingBusinessAs?: string | null
  industry?: string | null
  businessType?: string | null
  registrationNumber?: string | null
  trn?: string | null
  nisNumber?: string | null
  gctNumber?: string | null
  taxId?: string | null
  incorporationDate?: string | null
  fax?: string | null
  primaryContactUserId?: string | null
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
    | 'logo_file_id'
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
  organizationId: string
  email: string
  role: string
  status: string
  expiresAt: number
  createdAt: number
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
  featurePrefix: string
  organizationId: string | null
  clientId: string
  clientType: string
  appKind: AdminAppKind
  status: AdminAppStatus
  allowedRedirectUris: string[]
  allowedLogoutUris: string[]
  logoUrl: string | null
  logoFileId: string | null
  homepageUrl: string | null
  type: string
  scopesAllowed: string[]
  createdAt: number
  updatedAt: number
}

export type AdminAppPublic = {
  object: 'app'
  name: string
  logoUrl: string | null
  logoFileId: string | null
  appKind: AdminAppKind
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
  logoUrl: string | null
  logoFileId: string | null
  homepageUrl: string | null
  appKind: AdminAppKind
  status: AdminAppStatus
  organizationId: string | null
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
  appId: string
  name: string | null
  revoked: boolean
  expiresAt: number | null
  lastUsedAt: number | null
  createdAt: number
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
  expiresAt?: number
}

export type AdminApiKeyUpdateParams = {
  name?: string | null
}

export type AdminMembership = {
  object: 'membership'
  id: string
  organizationId: string
  userId: string
  workosMembershipId: string | null
  role: string
  roleId: string | null
  status: string
  createdAt: number
  updatedAt: number
}

export type AdminMembershipCreateParams = {
  organizationId: string
  userId: string
  role?: string
  status?: string
}

export type AdminMembershipUpdateParams = Partial<{
  role: string
  status: string
  workosMembershipId: string | null
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
  providerFeatureId: string | null
  providerEnvironmentId: string | null
  slug: string
  name: string
  description: string | null
  tags: string[]
  enabled: boolean
  defaultValue: boolean
  valueType: string | null
  value: unknown
  serverSideOnly: boolean
  archivedAt: number | null
  parentFeatureId: string | null
  providerMetadata: Record<string, unknown> | null
  consumerDefaultEnabled: boolean
  scope: string
  appId: string | null
  syncedAt: number
  createdAt: number
  updatedAt: number
}

export type AdminFeatureEvaluationDecision = {
  object: 'feature_evaluation'
  feature: AdminFeature
  globalEnabled: boolean
  parentEnabled: boolean
  moduleGated: boolean
  moduleEntitled: boolean
  organizationOverride: boolean | null
  userOverride: boolean | null
  enabled: boolean
}

export type AdminFeatureCreateParams = {
  name: string
  slug?: string
  description?: string | null
  defaultEnabled?: boolean
  scope?: string
  consumerDefaultEnabled?: boolean
  defaultValue?: boolean | null
  valueType?: string | null
  value?: unknown
  tags?: string[]
  serverSideOnly?: boolean
  parentFeatureId?: string | null
  appId: string | null
}

export type AdminFeatureUpdateParams = {
  description?: string | null
  enabled?: boolean
  appId?: string | null
  tags?: string[]
  consumerDefaultEnabled?: boolean
  scope?: string
  defaultValue?: boolean
  valueType?: string | null
  value?: unknown
  serverSideOnly?: boolean
  archived?: boolean
  parentFeatureId?: string | null
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
  userId: string
  featureId: string
  slug: string
  status: string
  note: string | null
  syncedAt: number | null
  createdAt: number
  updatedAt: number
}

export type AdminUserFeatureGrantParams = {
  featureId: string
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
  organizationId: string
  featureId: string
  slug: string
  status: string
  note: string | null
  syncedAt: number
  createdAt: number
  updatedAt: number
}

/** An organization override, carrying the identity needed to render it. */
export type AdminOrgFeatureGrantItem = {
  object: 'org_feature_grant'
  id: string
  organizationId: string
  featureId: string
  slug: string
  status: string
  note: string | null
  organizationName: string | null
  organizationSlug: string
  organizationLogoUrl: string | null
  createdAt: number
  updatedAt: number
}

/** A user override, carrying the identity needed to render it. */
export type AdminUserFeatureGrantItem = {
  object: 'user_feature_grant'
  id: string
  userId: string
  featureId: string
  slug: string
  status: string
  note: string | null
  userEmail: string
  userFirstName: string
  userLastName: string
  userUsername: string | null
  userAvatar: string | null
  createdAt: number
  updatedAt: number
}

/** Every override attached to one feature. Not paginated — `has_more` is always false. */
export type AdminFeatureGrants = {
  object: 'feature_grants'
  featureId: string
  organizations: AdminListResponse<AdminOrgFeatureGrantItem>
  users: AdminListResponse<AdminUserFeatureGrantItem>
}

export type AdminOrgFeatureGrantParams = {
  featureId: string
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
  logoUrl: string | null
  logoFileId: string | null
  homepageUrl: string | null
  appKind: 'internal' | 'platform' | 'product' | 'external'
  status: string
  enrolledAt: number
  lastSeenAt: number
}

export type AdminUserAppsGroup = {
  object: 'user_apps'
  userId: string
  data: AdminUserApp[]
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
  hasMore: boolean
  url: string
  totalCount: number | null
}

export type AdminDevice = {
  object: 'device'
  id: string
  userId: string
  fingerprint: string
  confidence: string
  deviceType: string
  deviceBrand: string | null
  deviceModel: string | null
  osName: string | null
  osVersion: string | null
  browserName: string | null
  browserVersion: string | null
  isBot: boolean
  label: string | null
  trusted: boolean
  trustedAt: number | null
  trustedBy: string | null
  blockedAt: number | null
  blockedBy: string | null
  blockReason: string | null
  firstSeenAt: number
  lastSeenAt: number
  lastIp: string | null
  lastCountryCode: string | null
  signInCount: number
  createdAt: number
  updatedAt: number
}

export type AdminAuthAttempt = {
  object: 'auth_attempt'
  id: string
  event: string
  outcome: string
  failureCode: string | null
  identifier: string | null
  userId: string | null
  appId: string | null
  sessionId: string | null
  realm: string | null
  deviceId: string | null
  deviceFingerprint: string | null
  ipAddress: string | null
  ipCountryCode: string | null
  ipRegionCode: string | null
  ipRegion: string | null
  ipCity: string | null
  ipPostalCode: string | null
  ipTimezone: string | null
  ipLatitude: string | null
  ipLongitude: string | null
  ipAsn: string | null
  ipAsOrganization: string | null
  userAgent: string | null
  deviceType: string | null
  deviceBrand: string | null
  deviceModel: string | null
  osName: string | null
  osVersion: string | null
  browserName: string | null
  browserVersion: string | null
  isBot: boolean
  contextTrusted: boolean
  riskScore: number | null
  riskReasons: string[] | null
  requestId: string | null
  createdAt: number
}

export type AdminSession = {
  object: 'session'
  id: string
  userId: string
  appId: string | null
  expiresAt: number
  ipAddress: string | null
  userAgent: string | null
  deviceId: string | null
  ipCountryCode: string | null
  ipRegion: string | null
  ipCity: string | null
  ipAsn: string | null
  ipAsOrganization: string | null
  lastSeenAt: number | null
  revokedAt: number | null
  revokedBy: string | null
  createdAt: number
  updatedAt: number
}

export type AdminAuthAttemptSummary = {
  object: 'auth_attempt_summary'
  window: '24h' | '7d' | '30d'
  total: number
  outcomes: Record<string, number>
  topCountries: { value: string; count: number }[]
  topFailureCodes: { value: string; count: number }[]
  topFailureIps: { value: string; count: number }[]
}

export type AdminDeletedSession = {
  object: 'session'
  id: string
  deleted: true
}
export type AdminDeletedUserSessions = {
  object: 'session_list'
  userId: string
  deleted: true
  revokedCount: number
}

export type AdminSearchResponse<T> = Omit<AdminListResponse<T>, 'object'> & {
  object: 'search_result'
}

export type AdminAddress = {
  object: 'address'
  id: string
  userId: string | null
  organizationId: string | null
  type: 'billing' | 'shipping' | 'home' | 'work' | 'other'
  label: string | null
  line1: string | null
  line2: string | null
  city: string | null
  regionId: string | null
  countryCode: string | null
  postalCode: string | null
  isDefault: boolean
  createdAt: number
  updatedAt: number
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
  regionId: string | null
  countryCode: string | null
  postalCode: string | null
  isDefault: boolean
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
  createdAt: number
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
  userId: string
  sessionsRevoked: number
}

export type AdminBillingAccount = {
  object: 'billing_account'
  id: string
  organizationId: string
  name: string | null
  email: string | null
  invoiceEmail: string | null
  currency: string | null
  taxExempt: string | null
  balance: number
  defaultPaymentMethodId: string | null
  invoiceSettings: Record<string, unknown> | null
  preferredLocales: Record<string, unknown> | null
  address: Record<string, unknown> | null
  shipping: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  createdAt: number
  updatedAt: number
}

export type AdminBillingAccountCreateParams = {
  organizationId: string
  name?: string | null
  email?: string | null
  invoiceEmail?: string | null
  currency?: string | null
  taxExempt?: string | null
  balance?: number
  defaultPaymentMethodId?: string | null
  invoiceSettings?: Record<string, unknown> | null
  preferredLocales?: Record<string, unknown> | null
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
  priceId: string
  productId: string | null
  productSlug: string | null
  productName: string | null
  quantity: number
  billingThresholds: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
}

export type AdminSubscriptionItemCreateParams = {
  priceId: string
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
  billingAccountId: string | null
  organizationId: string
  appId: string
  appSlug: string | null
  appName: string | null
  appLogoUrl: string | null
  appKind: 'internal' | 'platform' | 'product' | 'external' | null
  status: AdminSubscriptionStatus
  providerStatus: string | null
  statusReason: string | null
  financeLifecycleVersion: number
  collectionMethod: string
  billingCycleAnchor: number | null
  items: AdminSubscriptionItem[]
  currentPeriodStart: number | null
  currentPeriodEnd: number | null
  cancelAt: number | null
  cancelAtPeriodEnd: boolean
  canceledAt: number | null
  endedAt: number | null
  pauseCollection: Record<string, unknown> | null
  trialStart: number | null
  trialEnd: number | null
  startDate: number | null
  defaultPaymentMethodId: string | null
  latestInvoiceId: string | null
  pendingUpdate: Record<string, unknown> | null
  scheduleId: string | null
  metadata: Record<string, unknown> | null
  createdAt: number
  updatedAt: number
}

export type AdminSubscriptionCreateParams = {
  billingAccountId?: string | null
  organizationId: string
  appId: string
  priceId?: string | null
  status?: AdminSubscriptionStatus
  collectionMethod?: string
  cancelAtPeriodEnd?: boolean
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
  productId: string
  unitAmount: number
  currency: string
  /** Recurring billing interval. Null for a price with no recurring charge. */
  billingInterval: 'month' | 'year' | null
  intervalCount: number | null
  status: 'active' | 'archived'
  active: boolean
  lookupKey: string | null
  name: string | null
  nickname: string | null
  type: string
  billingScheme: string
  tiersMode: string | null
  tiers: Record<string, unknown> | null
  recurring: Record<string, unknown> | null
  taxBehavior: string | null
  transformQuantity: Record<string, unknown> | null
  unitAmountDecimal: string | null
  trialPeriodDays: number | null
  metadata: Record<string, unknown> | null
  archivedAt: number | null
  createdAt: number
  updatedAt: number
}

export type AdminPriceCreateParams = {
  unitAmount?: number
  currency?: string
  billingInterval?: 'month' | 'year' | null
  intervalCount?: number | null
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
  appId: string | null
  appSlug: string | null
  appName: string | null
  appLogoUrl: string | null
  appKind: 'internal' | 'platform' | 'product' | 'external' | null
  status: 'active' | 'archived'
  active: boolean
  statementDescriptor: string | null
  unitLabel: string | null
  taxCodeId: string | null
  lookupKey: string | null
  metadata: Record<string, unknown> | null
  archivedAt: number | null
  prices: AdminPrice[]
  /** Durable application modules included in this plan. */
  moduleIds: string[]
  createdAt: number
  updatedAt: number
}

export type AdminProductCreateParams = {
  slug: string
  name: string
  description?: string | null
  appId?: string | null
  taxCodeId?: string | null
  moduleIds?: string[]
  price: AdminPriceCreateParams
}

export type AdminProductModulesReplaceParams = {
  moduleIds: string[]
}

export type AdminApplicationModule = {
  object: 'application_module'
  id: string
  appId: string
  key: string
  name: string
  description: string | null
  featureId: string | null
  featureSlug: string | null
  status: 'active' | 'archived'
  position: number
  createdAt: number
  updatedAt: number
}

export type AdminApplicationModuleCreateParams = {
  appId: string
  key: string
  name: string
  description?: string | null
  featureId?: string | null
  position?: number
}

export type AdminApplicationModuleUpdateParams = Partial<{
  name: string
  description: string | null
  featureId: string | null
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
  taxCodeId: string | null
}>

export type AdminDeletedProduct = {
  object: 'product'
  id: string
  deleted: true
}

export type AdminSubscriptionBatch = {
  object: 'list'
  data: AdminSubscription[]
  totalCount: number
}

export type AdminOrgRole = {
  object: 'organization_role'
  id: string
  organizationId: string
  name: string
  displayName: string
  description: string | null
  permissions: string[]
  /** True for default roles seeded at org creation; immutable through the API. */
  isSystem: boolean
  membersCount: number | null
  createdAt: number
  updatedAt: number
}

export type AdminOrgRoleCreateParams = {
  name: string
  displayName: string
  description?: string | null
  permissions: string[]
}

export type AdminOrgRoleUpdateParams = Partial<{
  displayName: string
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
  userId: string
  role: string
  roleId: string | null
  status: string
  firstName: string | null
  lastName: string | null
  email: string | null
  avatar: string | null
  createdAt: number
}

export type AdminAppAssignment = {
  object: 'app_assignment'
  id: string
  organizationId: string
  userId: string
  appId: string
  appSlug: string | null
  appName: string | null
  status: string
  /** User ID of the member who granted access. Null for system grants. */
  assignedBy: string | null
  createdAt: number
  updatedAt: number
}

export type AdminAppAssignmentCreateParams = {
  userId: string
  appId?: string
  appSlug?: string
}

export type AdminOrgLocation = {
  object: 'org_location'
  id: string
  organizationId: string
  name: string
  code: string | null
  type: string
  status: string
  isPrimary: boolean
  phone: string | null
  email: string | null
  line1: string | null
  line2: string | null
  city: string | null
  regionId: string | null
  countryCode: string | null
  postalCode: string | null
  timezone: string | null
  metadata: Record<string, unknown> | null
  deletedAt: number | null
  deletedBy: string | null
  deletionReason: string | null
  createdAt: number
  updatedAt: number
}

export type AdminOrgLocationCreateParams = {
  name: string
  code?: string | null
  type?: string
  status?: string
  isPrimary?: boolean
  phone?: string | null
  email?: string | null
  line1?: string | null
  line2?: string | null
  city?: string | null
  regionId?: string | null
  countryCode?: string | null
  postalCode?: string | null
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
  organizationId: string
  /** Platform user ID when the contact is an org member; null for external contacts. */
  userId: string | null
  firstName: string
  lastName: string | null
  title: string | null
  type: string
  isPrimary: boolean
  email: string | null
  phone: string | null
  mobile: string | null
  notes: string | null
  metadata: Record<string, unknown> | null
  deletedAt: number | null
  deletedBy: string | null
  deletionReason: string | null
  createdAt: number
  updatedAt: number
}

export type AdminOrgContactCreateParams = {
  firstName: string
  /** Link the contact to a platform user (must be an active org member). */
  userId?: string | null
  lastName?: string | null
  title?: string | null
  type?: string
  isPrimary?: boolean
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
  organizationId: string
  name: string
  code: string | null
  description: string | null
  parentDepartmentId: string | null
  headMembershipId: string | null
  status: string
  metadata: Record<string, unknown> | null
  deletedAt: number | null
  deletedBy: string | null
  deletionReason: string | null
  createdAt: number
  updatedAt: number
}

export type AdminOrgDepartmentCreateParams = {
  name: string
  code?: string | null
  description?: string | null
  parentDepartmentId?: string | null
  headMembershipId?: string | null
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
  membershipId: string
  organizationId: string
  userId: string | null
  employeeNumber: string | null
  jobTitle: string | null
  departmentId: string | null
  locationId: string | null
  managerMembershipId: string | null
  employmentType: string | null
  employmentStatus: string
  division: string | null
  costCenter: string | null
  workEmail: string | null
  workPhone: string | null
  startDate: number | null
  endDate: number | null
  metadata: Record<string, unknown> | null
  deletedAt: number | null
  deletedBy: string | null
  deletionReason: string | null
  createdAt: number
  updatedAt: number
}

export type AdminEmployeeProfileCreateParams = {
  membershipId: string
  employeeNumber?: string | null
  jobTitle?: string | null
  departmentId?: string | null
  locationId?: string | null
  managerMembershipId?: string | null
  employmentType?: string | null
  employmentStatus?: string
  division?: string | null
  costCenter?: string | null
  workEmail?: string | null
  workPhone?: string | null
  startDate?: number | null
  endDate?: number | null
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

export type AdminPlatformClientOptions = {
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

export type AdminUserPin = {
  object: 'pin'
  userId: string
  scope: string
  isSet: boolean
  setAt: number | null
  lastVerifiedAt: number | null
  failedAttempts: number
  lockedUntil: number | null
}

export type AdminUserPinVerification = {
  object: 'pin_verification'
  verified: boolean
  lockedUntil: number | null
}

export type AdminDeletedUserPin = {
  object: 'pin'
  userId: string
  deleted: true
}
