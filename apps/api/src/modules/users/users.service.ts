import { AppHttpError } from '@/http/errors'
import { generateId } from '@/platform/ids'
import { isLocked, validatePin, verifyPin } from '@/platform/pin'
import { nowUnixSeconds } from '@/platform/timestamps'
import { getSettings } from '@/config'
import {
  discloseIdentificationValue,
  sealIdentificationValue,
} from '@/services/identification-secrets'

import * as repo from './users.repository'

// Identification registry mirror
const IDENTIFICATION_TYPES: Record<
  string,
  {
    label: string
    countryCode: string | null
    pattern: string
    disclosureAppSlugs: Set<string>
  }
> = {
  trn: {
    label: 'Taxpayer Registration Number',
    countryCode: 'JM',
    pattern: String.raw`^\d{9}$`,
    disclosureAppSlugs: new Set(['876-couriers']),
  },
  passport: {
    label: 'Passport Number',
    countryCode: null,
    pattern: String.raw`^[A-Z0-9]{6,12}$`,
    disclosureAppSlugs: new Set(['876-couriers']),
  },
  drivers_license: {
    label: "Driver's License Number",
    countryCode: null,
    pattern: String.raw`^[A-Z0-9]{5,20}$`,
    disclosureAppSlugs: new Set(['876-couriers']),
  },
  national_id: {
    label: 'National ID',
    countryCode: null,
    pattern: String.raw`^[A-Z0-9]{5,20}$`,
    disclosureAppSlugs: new Set(['876-couriers']),
  },
  voters_id: {
    label: "Voter's ID",
    countryCode: 'JM',
    pattern: String.raw`^[A-Z0-9]{5,20}$`,
    disclosureAppSlugs: new Set(),
  },
  nis: {
    label: 'National Insurance Scheme Number',
    countryCode: 'JM',
    pattern: String.raw`^[A-Z0-9]{5,20}$`,
    disclosureAppSlugs: new Set(),
  },
  tax_id: {
    label: 'Tax Identification Number',
    countryCode: null,
    pattern: String.raw`^[A-Z0-9]{5,20}$`,
    disclosureAppSlugs: new Set(),
  },
  work_permit: {
    label: 'Work Permit Number',
    countryCode: null,
    pattern: String.raw`^[A-Z0-9]{5,20}$`,
    disclosureAppSlugs: new Set(),
  },
}

function normalizeIdentificationValue(type: string, raw: string): string {
  const stripped = raw.replace(/[\s-]/g, '')
  if (type === 'trn') return stripped.replace(/\D/g, '')
  return stripped.toUpperCase()
}

function isValidIdentificationValue(type: string, normalized: string): boolean {
  const cfg = IDENTIFICATION_TYPES[type]
  if (!cfg) return false
  return new RegExp(cfg.pattern).test(normalized)
}

// Username helpers
const USERNAME_MIN = 3
const USERNAME_MAX = 32
const USERNAME_RE = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/
const USERNAME_FORMAT_MSG = `Username must be ${USERNAME_MIN}-${USERNAME_MAX} characters and use only letters, numbers, and . _ - (not starting or ending with a separator).`

export function normalizeUsername(value: string): string {
  let username = value.toLowerCase().trim()
  username = username.replace(/[^a-z0-9._-]/g, '-')
  username = username.replace(/[-_.]{2,}/g, '-').replace(/^[-_.]+|[-_.]+$/g, '')
  return username.slice(0, USERNAME_MAX) || 'user'
}

export function validateUsernameFormat(value: string): string {
  const candidate = value.trim().toLowerCase()
  if (
    candidate.length < USERNAME_MIN ||
    candidate.length > USERNAME_MAX ||
    !USERNAME_RE.test(candidate)
  ) {
    throw new AppHttpError({
      code: 'user/invalid-username',
      message: USERNAME_FORMAT_MSG,
      httpStatus: 400,
    })
  }
  return candidate
}

export async function evaluateUsername(
  username: string,
  excludeUserId?: string | null
): Promise<{ available: boolean; code: string; reason: string }> {
  try {
    validateUsernameFormat(username)
  } catch (e) {
    const err = e as AppHttpError
    return { available: false, code: 'invalid', reason: err.message }
  }
  const candidate = username.trim().toLowerCase()
  if (await repo.isReservedUsername(candidate)) {
    return {
      available: false,
      code: 'reserved',
      reason: 'This username is reserved and cannot be used.',
    }
  }
  const existing = await repo.findUserByUsername(candidate, true)
  if (existing && existing.id !== excludeUserId) {
    return {
      available: false,
      code: 'taken',
      reason: 'This username is already taken.',
    }
  }
  return {
    available: true,
    code: 'available',
    reason: 'Username is available.',
  }
}

export async function assertUsernameAvailable(
  username: string,
  excludeUserId?: string | null
): Promise<string> {
  const { available, code, reason } = await evaluateUsername(
    username,
    excludeUserId
  )
  if (available) return username.trim().toLowerCase()
  if (code === 'invalid')
    throw new AppHttpError({
      code: 'user/invalid-username',
      message: reason,
      httpStatus: 400,
    })
  throw new AppHttpError({
    code: 'user/username-unavailable',
    message: 'This username is not available.',
    httpStatus: 409,
  })
}

async function uniqueUsername(
  base: string,
  reserved: Set<string>,
  reservedNames?: Set<string> | null
): Promise<string> {
  let candidate = base.slice(0, 32)
  let index = 2
  const checkReserved = async (name: string): Promise<boolean> => {
    if (reservedNames) return reservedNames.has(name)
    return repo.isReservedUsername(name)
  }
  while (
    reserved.has(candidate) ||
    (await checkReserved(candidate)) ||
    (await repo.findUserByUsername(candidate, true))
  ) {
    const suffix = `-${index}`
    candidate = `${base.slice(0, 32 - suffix.length)}${suffix}`
    index += 1
  }
  reserved.add(candidate)
  return candidate
}

// Core user helpers
export async function requireUser(
  userId: string
): Promise<import('./users.serializers').UserRow> {
  const user = await repo.findUserById(userId)
  if (!user)
    throw new AppHttpError({
      code: 'user/not-found',
      message: 'No user exists with the provided identifier.',
      httpStatus: 404,
    })
  return user
}

export async function requireUserIncludeDeleted(userId: string) {
  const user = await repo.findUserById(userId, true)
  if (!user)
    throw new AppHttpError({
      code: 'user/not-found',
      message: 'No user exists with the provided identifier.',
      httpStatus: 404,
    })
  return user
}

// Feature grant helpers
export async function grantUserFeature(
  userId: string,
  featureId: string,
  enabled: boolean,
  note?: string | null
) {
  const user = await repo.findUserById(userId)
  if (!user)
    throw new AppHttpError({
      code: 'feature/user-not-found',
      message: 'No user exists with the provided identifier.',
      httpStatus: 404,
    })
  const feature = await repo.findFeatureById(featureId)
  if (!feature)
    throw new AppHttpError({
      code: 'feature/not-found',
      message: 'No feature exists with the provided identifier.',
      httpStatus: 404,
    })
  if (
    enabled &&
    (feature as unknown as { scope: string }).scope === 'enterprise'
  ) {
    throw new AppHttpError({
      code: 'feature/scope-mismatch',
      message: 'This feature cannot be granted to the specified target type.',
      httpStatus: 400,
    })
  }
  const now = BigInt(nowUnixSeconds())
  const existing = await repo.findUserFeature(userId, featureId)
  const status = enabled ? 'enabled' : 'disabled'
  let row: unknown
  if (existing) {
    row = await repo.updateUserFeature(existing.id, {
      status,
      ...(note !== undefined ? { note } : {}),
      syncedAt: now,
      updatedAt: now,
    })
  } else {
    const id = generateId('userFeature')
    row = await repo.createUserFeature({
      id,
      userId,
      featureId,
      status,
      note: note ?? null,
      syncedAt: now,
      createdAt: now,
      updatedAt: now,
    })
  }
  return row
}

// Identification disclosure entitlement
export async function discloseIdentification(params: {
  userId: string
  type: string
  organizationId: string
  appSlug: string
  reason?: string | null
  requestContext: { ip?: string | null; deviceSignal?: string | null }
}): Promise<{
  value: string
  countryCode: string | null
  verified: boolean
  disclosedAt: number
}> {
  const identification = await repo.findIdentificationByType(
    params.userId,
    params.type
  )
  if (!identification)
    throw new AppHttpError({
      code: 'identification/not-found',
      message: 'No identification of this type exists for this user.',
      httpStatus: 404,
    })
  const cfg = IDENTIFICATION_TYPES[params.type]
  if (!cfg || !cfg.disclosureAppSlugs.has(params.appSlug)) {
    throw new AppHttpError({
      code: 'identification/app-not-entitled',
      message: 'This app is not entitled to view this identification type.',
      httpStatus: 403,
    })
  }
  const subscription = await repo.getSubscriptionByAppSlug(
    params.organizationId,
    params.appSlug
  )
  if (
    !subscription ||
    (subscription as unknown as { status: string }).status !== 'active'
  ) {
    throw new AppHttpError({
      code: 'identification/subscription-required',
      message:
        'The requesting organization does not have an active subscription to this app.',
      httpStatus: 403,
    })
  }
  const now = nowUnixSeconds()
  const appName = (
    subscription as unknown as { app: { name: string; id: string } }
  ).app.name
  const appId = (subscription as unknown as { app: { id: string } }).app.id
  await repo.createAuditEvent({
    id: generateId('auditEvent'),
    event: 'user_identification.disclosed',
    source: 'server',
    appName,
    appId,
    userId: params.userId,
    path: `/users/${params.userId}/identifications/${params.type}/disclose`,
    search: null,
    referrer: null,
    title: null,
    requestId: null,
    sessionId: null,
    distinctId: null,
    properties: {
      organization_id: params.organizationId,
      app_slug: params.appSlug,
      identification_type: params.type,
      reason: params.reason ?? null,
      ip_address: params.requestContext.ip ?? null,
      device_fingerprint: null,
    },
    createdAt: BigInt(now),
  })
  const value = await discloseIdentificationValue({
    userId: identification.userId,
    type: identification.type,
    valueCiphertext: identification.valueCiphertext,
    valueKeyId: identification.valueKeyId,
    valueProvider: identification.valueProvider,
    value: identification.value,
    valueLast4: identification.valueLast4,
  } as never)
  return {
    value,
    countryCode: identification.countryCode,
    verified: identification.verified,
    disclosedAt: now,
  }
}

export async function createIdentification(params: {
  userId: string
  type: string
  rawValue: string
  countryCode?: string | null
}): Promise<import('./users.serializers').UserIdentificationRow> {
  const cfg = IDENTIFICATION_TYPES[params.type]
  if (!cfg)
    throw new AppHttpError({
      code: 'identification/unknown-type',
      message: 'Unknown identification type.',
      httpStatus: 422,
    })
  const normalized = normalizeIdentificationValue(params.type, params.rawValue)
  if (!isValidIdentificationValue(params.type, normalized)) {
    throw new AppHttpError({
      code: 'identification/invalid-value',
      message: 'The provided value is not valid for this identification type.',
      httpStatus: 422,
    })
  }
  const existing = await repo.findIdentificationByType(
    params.userId,
    params.type
  )
  if (existing)
    throw new AppHttpError({
      code: 'identification/already-exists',
      message: 'An identification of this type already exists for this user.',
      httpStatus: 409,
    })
  const settings = getSettings()
  const sealed = await sealIdentificationValue({
    userId: params.userId,
    identificationType: params.type,
    normalizedValue: normalized,
    settings,
  })
  const now = BigInt(nowUnixSeconds())
  const row = await repo.createIdentification({
    id: generateId('userIdentification'),
    userId: params.userId,
    type: params.type,
    value: '',
    valueCiphertext: sealed.ciphertext,
    valueKeyId: sealed.keyId,
    valueProvider: sealed.provider,
    valueLast4: sealed.last4,
    valueHash: sealed.valueHash,
    countryCode: params.countryCode ?? cfg.countryCode,
    verified: false,
    verifiedAt: null,
    verifiedBy: null,
    createdAt: now,
    updatedAt: now,
  })
  return row
}

export async function updateIdentification(params: {
  userId: string
  type: string
  rawValue: string
  countryCode?: string | null
}): Promise<import('./users.serializers').UserIdentificationRow> {
  const existing = await repo.findIdentificationByType(
    params.userId,
    params.type
  )
  if (!existing)
    throw new AppHttpError({
      code: 'identification/not-found',
      message: 'No identification of this type exists for this user.',
      httpStatus: 404,
    })
  const normalized = normalizeIdentificationValue(params.type, params.rawValue)
  if (!isValidIdentificationValue(params.type, normalized)) {
    throw new AppHttpError({
      code: 'identification/invalid-value',
      message: 'The provided value is not valid for this identification type.',
      httpStatus: 422,
    })
  }
  const settings = getSettings()
  const sealed = await sealIdentificationValue({
    userId: params.userId,
    identificationType: params.type,
    normalizedValue: normalized,
    settings,
  })
  const now = BigInt(nowUnixSeconds())
  const updated = await repo.updateIdentificationValue(existing.id, {
    value: '',
    valueCiphertext: sealed.ciphertext,
    valueKeyId: sealed.keyId,
    valueProvider: sealed.provider,
    valueLast4: sealed.last4,
    valueHash: sealed.valueHash,
    countryCode:
      params.countryCode !== undefined && params.countryCode !== null
        ? params.countryCode
        : existing.countryCode,
    verified: false,
    verifiedAt: null,
    verifiedBy: null,
    updatedAt: now,
  })
  if (!updated)
    throw new AppHttpError({
      code: 'identification/not-found',
      message: 'No identification of this type exists for this user.',
      httpStatus: 404,
    })
  return updated
}

// PIN helpers
export async function setUserPin(
  userId: string,
  pin: string,
  scope = 'account'
): Promise<import('./users.serializers').UserPinRow> {
  await requireUser(userId)
  const profile = await repo.findProfileByUserId(userId)
  try {
    validatePin(pin, { dateOfBirth: profile?.dateOfBirth ?? null })
  } catch (e) {
    const msg = (e as Error).message
    throw new AppHttpError({
      code: 'pin/rejected',
      message: msg,
      httpStatus: 422,
    })
  }
  const { hashPin } = await import('@/platform/pin')
  const pinHash = await hashPin(pin)
  const row = await repo.setPin(userId, pinHash, scope)
  const now = BigInt(nowUnixSeconds())
  await repo.createAuditEvent({
    id: generateId('auditEvent'),
    event: 'user_pin.set',
    source: 'server',
    appName: '876',
    appId: null,
    userId,
    path: `/users/${userId}/pin`,
    search: null,
    referrer: null,
    title: null,
    requestId: null,
    sessionId: null,
    distinctId: null,
    properties: { scope },
    createdAt: now,
  })
  return row
}

export async function verifyUserPin(
  userId: string,
  pin: string,
  scope = 'account'
): Promise<{ verified: boolean; lockedUntil: number | null }> {
  await requireUser(userId)
  const row = await repo.findPin(userId, scope)
  if (!row)
    throw new AppHttpError({
      code: 'pin/not-set',
      message: 'No PIN is set for this account.',
      httpStatus: 404,
    })
  const now = nowUnixSeconds()
  if (isLocked(row.lockedUntil ? Number(row.lockedUntil) : null, now)) {
    return {
      verified: false,
      lockedUntil: row.lockedUntil ? Number(row.lockedUntil) : null,
    }
  }
  const ok = await verifyPin(pin, row.pinHash)
  if (!ok) {
    await repo.recordPinFailure(row)
    // re-read for lockedUntil
    const updated = await repo.findPin(userId, scope)
    return {
      verified: false,
      lockedUntil: updated?.lockedUntil
        ? Number(updated.lockedUntil)
        : row.lockedUntil
          ? Number(row.lockedUntil)
          : null,
    }
  }
  await repo.recordPinSuccess(row)
  return { verified: true, lockedUntil: null }
}

// Backfill
export async function backfillUsernames(): Promise<{
  updated: number
  ids: string[]
}> {
  const users = await repo.listAllUsers()
  const reserved = new Set<string>(
    users
      .filter((u) => u.username)
      .map((u) => (u.username as string).toLowerCase())
  )
  const reservedNames = new Set<string>(
    (await repo.listReservedUsernames()).map((r) => r.username)
  )
  const updatedIds: string[] = []
  const now = BigInt(nowUnixSeconds())
  for (const user of users) {
    if (user.username || !user.email) continue
    const base = normalizeUsername(user.email.split('@', 1)[0] ?? 'user')
    const candidate = await uniqueUsername(base, reserved, reservedNames)
    await repo.updateUser(user.id, {
      username: candidate,
      updatedAt: now,
    } as never)
    updatedIds.push(user.id)
  }
  return { updated: updatedIds.length, ids: updatedIds }
}

// Ensure helpers for username uniqueness in create/ensure
export { uniqueUsername }
