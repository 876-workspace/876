import {
  fromDbUnixSeconds,
  nullableFromDbUnixSeconds,
} from '@/platform/timestamps'

import type {
  MobileNumber,
  MobileNumberVerification,
} from './mobile-numbers.schemas'

export type MobileNumberRow = {
  id: string
  userId: string
  number: string
  type: string
  isPrimary: boolean
  verificationStatus: string
  verificationId: string | null
  verifiedAt: bigint | null
  carrierName: string | null
  lineType: string | null
  createdAt: bigint
  updatedAt: bigint
}

export type VerificationRow = {
  id: string
  identifier: string
  value: string
  type: string
  expiresAt: bigint
  createdAt: bigint
  updatedAt: bigint
  provider: string | null
  providerSid: string | null
  subjectType: string | null
  subjectId: string | null
  channel: string | null
  status: string | null
  attemptCount: number | null
  lastSentAt: bigint | null
  canResendAt: bigint | null
  verifiedAt: bigint | null
  metadata: unknown
}

export function serializeMobileNumber(row: MobileNumberRow): MobileNumber {
  return {
    object: 'mobile_number',
    id: row.id,
    user_id: row.userId,
    number: row.number,
    type: row.type,
    is_primary: row.isPrimary,
    verification_status: row.verificationStatus,
    verification_id: row.verificationId,
    verified_at: nullableFromDbUnixSeconds(row.verifiedAt),
    carrier_name: row.carrierName,
    line_type: row.lineType,
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeVerification(
  row: VerificationRow
): MobileNumberVerification {
  return {
    object: 'mobile_number_verification',
    id: row.id,
    mobile_number_id: row.subjectId ?? '',
    provider: row.provider,
    provider_sid: row.providerSid,
    channel: row.channel,
    status: row.status,
    attempt_count: row.attemptCount ?? 0,
    last_sent_at: nullableFromDbUnixSeconds(row.lastSentAt),
    can_resend_at: nullableFromDbUnixSeconds(row.canResendAt),
    verified_at: nullableFromDbUnixSeconds(row.verifiedAt),
    expires_at: fromDbUnixSeconds(row.expiresAt),
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}
