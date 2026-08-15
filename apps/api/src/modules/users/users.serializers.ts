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
    companyShortName: companyShortName,
    companyLogo: companyLogo,
    workosUserId: row.workosUserId,
    stripeCustomerId: row.stripeCustomerId,
    email: row.email,
    username: row.username,
    emailVerified: row.emailVerified,
    firstName: row.firstName,
    lastName: row.lastName,
    middleName: row.middleName,
    avatar: row.avatar,
    avatarFileId: row.avatarFileId,
    platformRole: row.platformRole,
    status: row.status,
    banned: row.banned,
    bannedReason: row.bannedReason,
    deletedAt: nullableFromDbUnixSeconds(row.deletedAt),
    deletedBy: row.deletedBy,
    deletionReason: row.deletionReason,
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }

export function serializeEnsuredUser(row: UserRow) {
  return {
    object: 'user' as const,
    id: row.id,
    stripeCustomerId: row.stripeCustomerId,
    email: row.email,
    username: row.username,
    emailVerified: row.emailVerified,
    firstName: row.firstName,
    lastName: row.lastName,
    middleName: row.middleName,
    avatar: row.avatar,
    avatarFileId: row.avatarFileId,
    status: row.status,
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }

export function serializeCurrentUser(row: UserRow) {
  return {
    object: 'user' as const,
    id: row.id,
    email: row.email,
    username: row.username,
    emailVerified: row.emailVerified,
    firstName: row.firstName,
    lastName: row.lastName,
    middleName: row.middleName,
    avatar: row.avatar,
    avatarFileId: row.avatarFileId,
    status: row.status,
    banned: row.banned,
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }

export function serializeConsumerProfile(
  user: UserRow,
  profile: UserProfileRow
) {
  return {
    object: 'consumer_profile' as const,
    id: profile.id,
    userId: user.id,
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    middleName: user.middleName,
    nickname: profile.nickname,
    avatar: user.avatar,
    avatarFileId: user.avatarFileId,
    gender: profile.gender as 'male' | 'female' | 'other' | null,
    phoneNumber: profile.phoneNumber,
    dateOfBirth: profile.dateOfBirth,
    language: profile.language,
    timezone: profile.timezone,
    createdAt: fromDbUnixSeconds(profile.createdAt),
    updatedAt: fromDbUnixSeconds(profile.updatedAt),
  }

export function serializeAddress(row: AddressRow) {
  return {
    object: 'address' as const,
    id: row.id,
    userId: row.userId,
    organizationId: row.organizationId,
    type: row.type,
    label: row.label,
    line1: row.line1,
    line2: row.line2,
    city: row.city,
    regionId: row.regionId,
    countryCode: row.countryCode,
    postalCode: row.postalCode,
    isDefault: row.isDefault,
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }

export function serializeContact(row: ContactRow) {
  return {
    object: 'user_contact' as const,
    id: row.id,
    ownerUserId: row.ownerUserId,
    contactUserId: row.contactUserId,
    contactUser: {
      object: 'user' as const,
      id: row.contactUser.id,
      email: row.contactUser.email,
      username: row.contactUser.username,
      firstName: row.contactUser.firstName,
      lastName: row.contactUser.lastName,
      middleName: row.contactUser.middleName,
      avatar: row.contactUser.avatar,
      avatarFileId: row.contactUser.avatarFileId,
    },
    nickname: row.nickname,
    notes: row.notes,
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }

export function serializeAccount(row: AccountRow) {
  return {
    object: 'account' as const,
    id: row.id,
    providerId: row.providerId,
    providerType: row.providerType,
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }

export function serializeReservedUsername(row: ReservedUsernameRow) {
  return {
    object: 'reserved_username' as const,
    username: row.username,
    reason: row.reason,
    createdAt: fromDbUnixSeconds(row.createdAt),
  }

const IDENTIFICATION_LABELS: Record<string, string> = {
  trn: 'Taxpayer Registration Number',
  passport: 'Passport Number',
  drivers_license: "Driver's License Number",
  national_id: 'National ID',
  voters_id: "Voter's ID",
  nis: 'National Insurance Scheme Number',
  taxId: 'Tax Identification Number',
  work_permit: 'Work Permit Number',
}

export function serializeUserIdentification(row: UserIdentificationRow) {
  const label = IDENTIFICATION_LABELS[row.type] ?? row.type
  return {
    object: 'user_identification' as const,
    id: row.id,
    userId: row.userId,
    type: row.type,
    label,
    countryCode: row.countryCode,
    valueMasked: maskedIdentificationValue({
      userId: row.userId,
      type: row.type,
      valueCiphertext: row.valueCiphertext,
      valueKeyId: row.valueKeyId,
      valueProvider: row.valueProvider,
      value: row.value,
      valueLast4: row.valueLast4,
    }),
    verified: row.verified,
    verifiedAt: nullableFromDbUnixSeconds(row.verifiedAt),
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }

export function serializeUserPin(
  userId: string,
  row: UserPinRow | null,
  scope = 'account'
) {
  if (!row) {
    return {
      object: 'pin' as const,
      userId: userId,
      scope,
      isSet: false as const,
      setAt: null,
      lastVerifiedAt: null,
      failedAttempts: 0,
      lockedUntil: null,
    }
  return {
    object: 'pin' as const,
    userId: userId,
    scope: row.scope,
    isSet: true as const,
    setAt: fromDbUnixSeconds(row.setAt),
    lastVerifiedAt: nullableFromDbUnixSeconds(row.lastVerifiedAt),
    failedAttempts: row.failedAttempts,
    lockedUntil: nullableFromDbUnixSeconds(row.lockedUntil),
  }

export function serializeUserApp(e: UserAppEnrollmentRow) {
  return {
    object: 'app' as const,
    id: e.app.id,
    name: e.app.name,
    slug: e.app.slug,
    logoUrl: e.app.logoUrl,
    logoFileId: e.app.logoFileId,
    homepageUrl: e.app.homepageUrl,
    appKind: e.app.appKind,
    status: e.app.status,
    enrolledAt: fromDbUnixSeconds(e.enrolledAt),
    lastSeenAt: fromDbUnixSeconds(e.lastSeenAt),
  }

export function serializeUserFeature(row: UserFeatureRow) {
  return {
    id: row.id,
    userId: row.userId,
    featureId: row.featureId,
    slug: row.feature.slug,
    status: row.status,
    note: row.note,
    syncedAt: fromDbUnixSeconds(row.syncedAt),
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
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
