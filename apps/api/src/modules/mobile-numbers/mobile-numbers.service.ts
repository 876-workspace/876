import { AppHttpError } from '@/platform/errors'
import { generateId } from '@/platform/ids'
import { getLogger } from '@/platform/logger'
import { normalizePhoneNumber } from '@/platform/phone'
import { enforceRateLimit } from '@/platform/rate-limit'
import { nowUnixSeconds } from '@/platform/timestamps'
import { getSettings, type Settings } from '@/config'
import {
  getPhoneLookupProvider,
  getPhoneVerificationProvider,
} from '@/providers/twilio'
import { channelDisabled, notConfigured } from '@/providers/twilio/errors'
import type {
  PhoneLookupProvider,
  PhoneVerificationProvider,
} from '@/providers/communications'

import * as repository from './mobile-numbers.repository'
import type { VerificationChannel } from './mobile-numbers.schemas'
import {
  serializeMobileNumber,
  serializeVerification,
  type MobileNumberRow,
  type VerificationRow,
} from './mobile-numbers.serializers'

const log = getLogger('mobile-numbers')

const CHANNEL_FLAGS: Record<VerificationChannel, string> = {
  sms: 'verifySmsEnabled',
  call: 'verifyCallEnabled',
  whatsapp: 'verifyWhatsappEnabled',
}

const RESEND_COOLDOWN_SECONDS = 60
const VERIFICATION_TTL_SECONDS = 600
const MAX_CHECK_ATTEMPTS = 5
const MAX_SENDS_PER_WINDOW = 5
const SEND_WINDOW_SECONDS = 24 * 60 * 60

function verificationError(
  code: string,
  message: string,
  httpStatus = 400
): AppHttpError {
  return new AppHttpError({ code, message, httpStatus })
}

function verificationMetadataSendCount(metadata: unknown): number {
  if (!metadata || typeof metadata !== 'object') return 0
  const value = (metadata as Record<string, unknown>).send_count
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value
    : 0
}

function requireChannel(
  channel: VerificationChannel,
  settings: Settings
): void {
  const flag = CHANNEL_FLAGS[channel] as keyof Settings['twilio']
  const enabled = settings.twilio[flag] as unknown as boolean
  if (!enabled) throw channelDisabled(channel)
}

async function requireMobileNumber(
  userId: string,
  mobileNumberId: string
): Promise<MobileNumberRow> {
  const row = await repository.findByIdForUser(userId, mobileNumberId)
  if (!row) {
    throw verificationError(
      'communications/invalid-phone-number',
      'The mobile number was not found.',
      404
    )
  }
  return row
}

async function requireVerification(
  row: MobileNumberRow,
  verificationId: string
): Promise<VerificationRow> {
  if (row.verificationId !== verificationId) {
    throw verificationError(
      'communications/verification-failed',
      'The verification was not found.',
      404
    )
  }
  const verification = await repository.findVerificationById(verificationId)
  if (
    !verification ||
    verification.subjectId !== row.id ||
    verification.subjectType !== 'mobile_number'
  ) {
    throw verificationError(
      'communications/verification-failed',
      'The verification was not found.',
      404
    )
  }
  return verification
}

async function audit(
  userId: string,
  event: string,
  properties: Record<string, unknown>
): Promise<void> {
  await repository.createAuditEvent({
    id: generateId('auditEvent'),
    event,
    source: 'api',
    appName: 'api',
    appId: null,
    userId,
    properties,
    createdAt: BigInt(nowUnixSeconds()),
  })
}

// ---- Public API ----

export async function createMobileNumber(
  userId: string,
  number: string,
  numberType: string,
  deps: {
    settings?: Settings
    provider?: PhoneVerificationProvider
    lookupProvider?: PhoneLookupProvider
  } = {}
): Promise<ReturnType<typeof serializeMobileNumber>> {
  const settings = deps.settings ?? getSettings()
  let normalized = normalizePhoneNumber(number)
  let carrierName: string | null = null
  let lineType: string | null = null

  if (settings.twilio.lookupEnabled) {
    const lookupProvider =
      deps.lookupProvider ?? getPhoneLookupProvider(settings)
    try {
      const lookup = await lookupProvider.createLookup({
        number: normalized,
        includeLineType: settings.twilio.lookupLineTypeEnabled,
      })
      if (lookup.valid === false) {
        throw new AppHttpError({
          code: 'communications/invalid-phone-number',
          message: 'Enter a valid international phone number.',
          httpStatus: 400,
        })
      }
      // Use E.164 from lookup when available; otherwise keep normalized input.
      // The lookup may return the same number in a different (canonical) form.
      if (lookup.number) normalized = lookup.number
      carrierName = lookup.carrierName
      lineType = lookup.lineType
    } catch (error) {
      if (
        error instanceof AppHttpError &&
        error.code === 'communications/invalid-phone-number'
      ) {
        throw error
      }
      log.warn(
        { code: (error as AppHttpError)?.code },
        'phone_lookup.fail_open'
      )
    }
  }

  const existing = await repository.findByNumberForUser(userId, normalized)
  if (existing) {
    throw verificationError(
      'communications/number-already-used',
      'This phone number is already on your account.',
      409
    )
  }

  const now = BigInt(nowUnixSeconds())
  const row = await repository.create({
    id: generateId('mobileNumber'),
    userId,
    number: normalized,
    type: numberType,
    isPrimary: false,
    verificationStatus: 'unverified',
    carrierName,
    lineType,
    createdAt: now,
    updatedAt: now,
  })

  return serializeMobileNumber(row)
}

export async function listMobileNumbers(userId: string): Promise<{
  object: 'list'
  data: ReturnType<typeof serializeMobileNumber>[]
  has_more: boolean
  url: string
  total_count: number | null
}> {
  const rows = await repository.listByUser(userId)
  return {
    object: 'list',
    data: rows.map(serializeMobileNumber),
    has_more: false,
    url: '/users/me/mobile-numbers',
    total_count: rows.length,
  }
}

export async function retrieveMobileNumber(
  userId: string,
  mobileNumberId: string
): Promise<ReturnType<typeof serializeMobileNumber>> {
  const row = await requireMobileNumber(userId, mobileNumberId)
  return serializeMobileNumber(row)
}

export async function updateMobileNumber(
  userId: string,
  mobileNumberId: string,
  numberType: string | null | undefined
): Promise<ReturnType<typeof serializeMobileNumber>> {
  const row = await requireMobileNumber(userId, mobileNumberId)
  const nextType = numberType ?? row.type
  const updated = await repository.updateMobileNumber(row.id, {
    type: nextType,
    updatedAt: BigInt(nowUnixSeconds()),
  })
  return serializeMobileNumber(updated)
}

export async function deleteMobileNumber(
  userId: string,
  mobileNumberId: string
): Promise<{ object: 'mobile_number'; id: string; deleted: true }> {
  const row = await requireMobileNumber(userId, mobileNumberId)
  if (row.isPrimary) {
    const user = await repository.findUserById(userId)
    if (user) {
      await repository.updateUserPhone(userId, {
        phone: null,
        phoneVerified: false,
        updatedAt: BigInt(nowUnixSeconds()),
      })
    }
  }
  await repository.deleteMobileNumber(row.id)
  return { object: 'mobile_number', id: mobileNumberId, deleted: true }
}

export async function createVerification(
  userId: string,
  mobileNumberId: string,
  channel: VerificationChannel,
  deps: {
    settings?: Settings
    provider?: PhoneVerificationProvider
  } = {}
): Promise<ReturnType<typeof serializeVerification>> {
  const settings = deps.settings ?? getSettings()
  const row = await requireMobileNumber(userId, mobileNumberId)

  if (settings.twilio.mode !== 'fake' && !settings.twilio.verifyLive) {
    throw notConfigured()
  }
  requireChannel(channel, settings)

  const now = nowUnixSeconds()
  const nowBig = BigInt(now)

  const previous = row.verificationId
    ? await repository.findVerificationById(row.verificationId)
    : null

  if (previous?.canResendAt && previous.canResendAt > nowBig) {
    throw verificationError(
      'communications/verification-pending',
      'A verification was sent recently. Please wait before requesting another.',
      429
    )
  }

  const withinWindow = Boolean(
    previous?.lastSentAt &&
    previous.lastSentAt > BigInt(now - SEND_WINDOW_SECONDS)
  )
  const sendCount = verificationMetadataSendCount(
    previous && withinWindow ? previous.metadata : null
  )
  if (sendCount >= MAX_SENDS_PER_WINDOW) {
    throw verificationError(
      'communications/rate-limited',
      'Too many verification messages have been sent.',
      429
    )
  }

  enforceRateLimit('communications.verify.send.user', userId, {
    maxAttempts: MAX_SENDS_PER_WINDOW,
    windowSeconds: SEND_WINDOW_SECONDS,
  })
  enforceRateLimit('communications.verify.send.number', row.number, {
    maxAttempts: MAX_SENDS_PER_WINDOW,
    windowSeconds: SEND_WINDOW_SECONDS,
  })

  const provider = deps.provider ?? getPhoneVerificationProvider(settings)
  const result = await provider.createVerification({
    toNumber: row.number,
    channel,
  })

  const verification = await repository.createVerification({
    id: generateId('verification'),
    identifier: row.number,
    value: '',
    type: 'phone',
    expiresAt: BigInt(now + VERIFICATION_TTL_SECONDS),
    provider: result.provider,
    providerSid: result.providerSid,
    subjectType: 'mobile_number',
    subjectId: row.id,
    channel,
    status: result.status,
    attemptCount: 0,
    lastSentAt: nowBig,
    canResendAt: BigInt(now + RESEND_COOLDOWN_SECONDS),
    metadata: { send_count: sendCount + 1 },
    createdAt: nowBig,
    updatedAt: nowBig,
  })

  await repository.updateMobileNumber(row.id, {
    verificationId: verification.id,
    verificationStatus: 'pending',
    updatedAt: nowBig,
  })

  await audit(userId, 'mobile_number.verification_sent', { channel })

  return serializeVerification(verification)
}

export async function approveVerification(
  userId: string,
  mobileNumberId: string,
  verificationId: string,
  code: string,
  makePrimary: boolean,
  deps: {
    settings?: Settings
    provider?: PhoneVerificationProvider
  } = {}
): Promise<ReturnType<typeof serializeVerification>> {
  const settings = deps.settings ?? getSettings()
  const row = await requireMobileNumber(userId, mobileNumberId)
  let verification = await requireVerification(row, verificationId)

  const now = nowUnixSeconds()
  const nowBig = BigInt(now)

  if (verification.expiresAt <= nowBig) {
    await repository.updateVerification(verification.id, {
      status: 'expired',
      updatedAt: nowBig,
    })
    throw verificationError(
      'communications/verification-expired',
      'The verification has expired.'
    )
  }

  if ((verification.attemptCount ?? 0) >= MAX_CHECK_ATTEMPTS) {
    await repository.updateVerification(verification.id, {
      status: 'failed',
      updatedAt: nowBig,
    })
    throw verificationError(
      'communications/max-attempts-reached',
      'Too many verification attempts.',
      429
    )
  }

  enforceRateLimit('communications.verify.check.user', userId, {
    maxAttempts: MAX_CHECK_ATTEMPTS,
    windowSeconds: 600,
  })
  enforceRateLimit('communications.verify.check.number', row.number, {
    maxAttempts: MAX_CHECK_ATTEMPTS,
    windowSeconds: 600,
  })

  const provider = deps.provider ?? getPhoneVerificationProvider(settings)
  const result = await provider.approveVerification({
    toNumber: row.number,
    code,
  })

  const nextAttemptCount = (verification.attemptCount ?? 0) + 1

  if (result.status !== 'approved') {
    if (result.status === 'expired') {
      await repository.updateVerification(verification.id, {
        status: 'expired',
        attemptCount: nextAttemptCount,
        updatedAt: nowBig,
      })
      throw verificationError(
        'communications/verification-expired',
        'The verification has expired.'
      )
    }

    if (nextAttemptCount >= MAX_CHECK_ATTEMPTS) {
      await repository.updateVerification(verification.id, {
        status: 'failed',
        attemptCount: nextAttemptCount,
        updatedAt: nowBig,
      })
      throw verificationError(
        'communications/max-attempts-reached',
        'Too many verification attempts.',
        429
      )
    }

    await repository.updateVerification(verification.id, {
      status: result.status,
      attemptCount: nextAttemptCount,
      updatedAt: nowBig,
    })
    throw verificationError(
      'communications/verification-failed',
      'The verification code is incorrect.'
    )
  }

  // Approved path — update verification, mobile number, and optionally user phone.
  verification = await repository.updateVerification(verification.id, {
    status: result.status,
    attemptCount: nextAttemptCount,
    verifiedAt: nowBig,
    updatedAt: nowBig,
  })

  // Fetch fresh mobile number row to apply primary logic consistently.
  let mobileRow = await repository.findByIdForUser(userId, mobileNumberId)
  if (!mobileRow)
    throw verificationError(
      'communications/invalid-phone-number',
      'The mobile number was not found.',
      404
    )

  const updates: Record<string, unknown> = {
    verificationStatus: 'verified',
    verifiedAt: nowBig,
    updatedAt: nowBig,
  }

  if (makePrimary) {
    await repository.clearPrimary(userId)
    ;(updates as Record<string, boolean>).isPrimary = true
  }

  // Re-read after clearPrimary to avoid stale isPrimary if this row was the previous primary.
  mobileRow = await repository.updateMobileNumber(
    mobileRow.id,
    updates as never
  )
  const finalRow = mobileRow

  if (finalRow.isPrimary) {
    const user = await repository.findUserById(userId)
    if (user) {
      await repository.updateUserPhone(userId, {
        phone: finalRow.number,
        phoneVerified: true,
        updatedAt: nowBig,
      })
    }
  }

  await audit(userId, 'mobile_number.verification_approved', {
    channel: verification.channel ?? '',
  })

  return serializeVerification(verification)
}

export async function makePrimary(
  userId: string,
  mobileNumberId: string
): Promise<ReturnType<typeof serializeMobileNumber>> {
  const row = await requireMobileNumber(userId, mobileNumberId)
  if (row.verificationStatus !== 'verified' || row.verifiedAt === null) {
    throw verificationError(
      'communications/number-not-verified',
      'Verify this phone number before making it primary.'
    )
  }

  const nowBig = BigInt(nowUnixSeconds())
  await repository.clearPrimary(userId)
  const updated = await repository.updateMobileNumber(row.id, {
    isPrimary: true,
    updatedAt: nowBig,
  })

  const user = await repository.findUserById(userId)
  if (user) {
    await repository.updateUserPhone(userId, {
      phone: updated.number,
      phoneVerified: true,
      updatedAt: nowBig,
    })
  }

  return serializeMobileNumber(updated)
}
