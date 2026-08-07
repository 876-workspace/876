import {
  fromDbUnixSeconds,
  nullableFromDbUnixSeconds,
} from '@/platform/timestamps'
import { maskedIdentificationValue } from '@/services/identification-secrets'

export type UserRow = {
  id: string
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
  platformRole: string | null
  status: string
  banned: boolean
  bannedReason: string | null
  deletedAt: bigint | null
  deletedBy: string | null
  deletionReason: string | null
  createdAt: bigint
  updatedAt: bigint
}

export type UserProfileRow = {
  id: string
  userId: string
  nickname: string | null
  gender: string | null
  phoneNumber: string | null
  dateOfBirth: string | null
  language: string | null
  timezone: string | null
  createdAt: bigint
  updatedAt: bigint
}

export type AddressRow = {
  id: string
  userId: string | null
  organizationId: string | null
  type: string
  label: string | null
  line1: string | null
  line2: string | null
  city: string | null
  regionId: string | null
  countryCode: string | null
  postalCode: string | null
  isDefault: boolean
  createdAt: bigint
  updatedAt: bigint
}

export type ContactRow = {
  id: string
  ownerUserId: string
  contactUserId: string
  nickname: string | null
  notes: string | null
  createdAt: bigint
  updatedAt: bigint
  contactUser: UserRow
}

export type AccountRow = {
  id: string
  providerId: string
  providerType: string
  createdAt: bigint
  updatedAt: bigint
}

export type ReservedUsernameRow = {
  username: string
  reason: string | null
  createdAt: bigint
}

export type UserIdentificationRow = {
  id: string
  userId: string
  type: string
  value: string
  valueCiphertext: string | null
  valueKeyId: string | null
  valueProvider: string | null
  valueLast4: string | null
  valueHash: string | null
  countryCode: string | null
  verified: boolean
  verifiedAt: bigint | null
  verifiedBy: string | null
  deletedAt: bigint | null
  createdAt: bigint
  updatedAt: bigint
}

export type UserPinRow = {
  id: string
  userId: string
  scope: string
  pinHash: string
  failedAttempts: number
  lockedUntil: bigint | null
  lastVerifiedAt: bigint | null
  setAt: bigint
  createdAt: bigint
  updatedAt: bigint
}

export type OauthGrantRow = {
  id: string
  userId: string
  appId: string
  scopes: string[]
  createdAt: bigint
  updatedAt: bigint
  revokedAt: bigint | null
  app: {
    id: string
    name: string
    clientId: string
    logoUrl: string | null
    homepageUrl: string | null
  }
}

export type UserAppEnrollmentRow = {
  id: string
  userId: string
  appId: string
  enrolledAt: bigint
  lastSeenAt: bigint
  app: {
    id: string
    name: string
    slug: string
    logoUrl: string | null
    logoFileId: string | null
    homepageUrl: string | null
    appKind: string
    status: string
  }
}

export type UserFeatureRow = {
  id: string
  userId: string
  featureId: string
  status: string
  note: string | null
  syncedAt: bigint
  createdAt: bigint
  updatedAt: bigint
  feature: { slug: string }
}

export const USER_SELECT = {
  id: true,
  workosUserId: true,
  stripeCustomerId: true,
  email: true,
  username: true,
  emailVerified: true,
  firstName: true,
  lastName: true,
  middleName: true,
  avatar: true,
  avatarFileId: true,
  platformRole: true,
  status: true,
  banned: true,
  bannedReason: true,
  deletedAt: true,
  deletedBy: true,
  deletionReason: true,
  createdAt: true,
  updatedAt: true,
} as const

export function serializeUser(
  row: UserRow,
  company: string | null = null,
  companyShortName: string | null = null,
  companyLogo: string | null = null
) {
  return {
    object: 'user' as const,
    id: row.id,
    company,
    company_short_name: companyShortName,
    company_logo: companyLogo,
    workos_user_id: row.workosUserId,
    stripe_customer_id: row.stripeCustomerId,
    email: row.email,
    username: row.username,
    email_verified: row.emailVerified,
    first_name: row.firstName,
    last_name: row.lastName,
    middle_name: row.middleName,
    avatar: row.avatar,
    avatar_file_id: row.avatarFileId,
    platform_role: row.platformRole,
    status: row.status,
    banned: row.banned,
    banned_reason: row.bannedReason,
    deleted_at: nullableFromDbUnixSeconds(row.deletedAt),
    deleted_by: row.deletedBy,
    deletion_reason: row.deletionReason,
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeEnsuredUser(row: UserRow) {
  return {
    object: 'user' as const,
    id: row.id,
    stripe_customer_id: row.stripeCustomerId,
    email: row.email,
    username: row.username,
    email_verified: row.emailVerified,
    first_name: row.firstName,
    last_name: row.lastName,
    middle_name: row.middleName,
    avatar: row.avatar,
    avatar_file_id: row.avatarFileId,
    status: row.status,
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeCurrentUser(row: UserRow) {
  return {
    object: 'user' as const,
    id: row.id,
    email: row.email,
    username: row.username,
    email_verified: row.emailVerified,
    first_name: row.firstName,
    last_name: row.lastName,
    middle_name: row.middleName,
    avatar: row.avatar,
    avatar_file_id: row.avatarFileId,
    status: row.status,
    banned: row.banned,
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeConsumerProfile(
  user: UserRow,
  profile: UserProfileRow
) {
  return {
    object: 'consumer_profile' as const,
    id: profile.id,
    user_id: user.id,
    email: user.email,
    username: user.username,
    first_name: user.firstName,
    last_name: user.lastName,
    middle_name: user.middleName,
    nickname: profile.nickname,
    avatar: user.avatar,
    avatar_file_id: user.avatarFileId,
    gender: profile.gender as 'male' | 'female' | 'other' | null,
    phone_number: profile.phoneNumber,
    date_of_birth: profile.dateOfBirth,
    language: profile.language,
    timezone: profile.timezone,
    created_at: fromDbUnixSeconds(profile.createdAt),
    updated_at: fromDbUnixSeconds(profile.updatedAt),
  }
}

export function serializeAddress(row: AddressRow) {
  return {
    object: 'address' as const,
    id: row.id,
    user_id: row.userId,
    organization_id: row.organizationId,
    type: row.type,
    label: row.label,
    line1: row.line1,
    line2: row.line2,
    city: row.city,
    region_id: row.regionId,
    country_code: row.countryCode,
    postal_code: row.postalCode,
    is_default: row.isDefault,
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeContact(row: ContactRow) {
  return {
    object: 'user_contact' as const,
    id: row.id,
    owner_user_id: row.ownerUserId,
    contact_user_id: row.contactUserId,
    contact_user: {
      object: 'user' as const,
      id: row.contactUser.id,
      email: row.contactUser.email,
      username: row.contactUser.username,
      first_name: row.contactUser.firstName,
      last_name: row.contactUser.lastName,
      middle_name: row.contactUser.middleName,
      avatar: row.contactUser.avatar,
      avatar_file_id: row.contactUser.avatarFileId,
    },
    nickname: row.nickname,
    notes: row.notes,
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeAccount(row: AccountRow) {
  return {
    object: 'account' as const,
    id: row.id,
    provider_id: row.providerId,
    provider_type: row.providerType,
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeReservedUsername(row: ReservedUsernameRow) {
  return {
    object: 'reserved_username' as const,
    username: row.username,
    reason: row.reason,
    created_at: fromDbUnixSeconds(row.createdAt),
  }
}

const IDENTIFICATION_LABELS: Record<string, string> = {
  trn: 'Taxpayer Registration Number',
  passport: 'Passport Number',
  drivers_license: "Driver's License Number",
  national_id: 'National ID',
  voters_id: "Voter's ID",
  nis: 'National Insurance Scheme Number',
  tax_id: 'Tax Identification Number',
  work_permit: 'Work Permit Number',
}

export function serializeUserIdentification(row: UserIdentificationRow) {
  const label = IDENTIFICATION_LABELS[row.type] ?? row.type
  return {
    object: 'user_identification' as const,
    id: row.id,
    user_id: row.userId,
    type: row.type,
    label,
    country_code: row.countryCode,
    value_masked: maskedIdentificationValue({
      userId: row.userId,
      type: row.type,
      valueCiphertext: row.valueCiphertext,
      valueKeyId: row.valueKeyId,
      valueProvider: row.valueProvider,
      value: row.value,
      valueLast4: row.valueLast4,
    }),
    verified: row.verified,
    verified_at: nullableFromDbUnixSeconds(row.verifiedAt),
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeUserPin(
  userId: string,
  row: UserPinRow | null,
  scope = 'account'
) {
  if (!row) {
    return {
      object: 'pin' as const,
      user_id: userId,
      scope,
      is_set: false as const,
      set_at: null,
      last_verified_at: null,
      failed_attempts: 0,
      locked_until: null,
    }
  }
  return {
    object: 'pin' as const,
    user_id: userId,
    scope: row.scope,
    is_set: true as const,
    set_at: fromDbUnixSeconds(row.setAt),
    last_verified_at: nullableFromDbUnixSeconds(row.lastVerifiedAt),
    failed_attempts: row.failedAttempts,
    locked_until: nullableFromDbUnixSeconds(row.lockedUntil),
  }
}

export function serializeUserApp(e: UserAppEnrollmentRow) {
  return {
    object: 'app' as const,
    id: e.app.id,
    name: e.app.name,
    slug: e.app.slug,
    logo_url: e.app.logoUrl,
    logo_file_id: e.app.logoFileId,
    homepage_url: e.app.homepageUrl,
    app_kind: e.app.appKind,
    status: e.app.status,
    enrolled_at: fromDbUnixSeconds(e.enrolledAt),
    last_seen_at: fromDbUnixSeconds(e.lastSeenAt),
  }
}

export function serializeUserFeature(row: UserFeatureRow) {
  return {
    id: row.id,
    user_id: row.userId,
    feature_id: row.featureId,
    slug: row.feature.slug,
    status: row.status,
    note: row.note,
    synced_at: fromDbUnixSeconds(row.syncedAt),
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeAuthorizedApp(row: OauthGrantRow) {
  return {
    object: 'authorized_app' as const,
    id: row.id,
    appId: row.appId,
    name: row.app.name,
    clientId: row.app.clientId,
    logoUrl: row.app.logoUrl,
    homepageUrl: row.app.homepageUrl,
    scopes: row.scopes ?? [],
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}
