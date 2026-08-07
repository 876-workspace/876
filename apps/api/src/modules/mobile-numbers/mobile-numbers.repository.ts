import { prisma } from '@/db/client'

import type {
  MobileNumberRow,
  VerificationRow,
} from './mobile-numbers.serializers'

/** Every query against `user_mobile_numbers` and `verifications`. */

const MOBILE_NUMBER_SELECT = {
  id: true,
  userId: true,
  number: true,
  type: true,
  isPrimary: true,
  verificationStatus: true,
  verificationId: true,
  verifiedAt: true,
  carrierName: true,
  lineType: true,
  createdAt: true,
  updatedAt: true,
} as const

const VERIFICATION_SELECT = {
  id: true,
  identifier: true,
  value: true,
  type: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
  provider: true,
  providerSid: true,
  subjectType: true,
  subjectId: true,
  channel: true,
  status: true,
  attemptCount: true,
  lastSentAt: true,
  canResendAt: true,
  verifiedAt: true,
  metadata: true,
} as const

export function findByIdForUser(
  userId: string,
  mobileNumberId: string
): Promise<MobileNumberRow | null> {
  return prisma.userMobileNumber.findFirst({
    where: { id: mobileNumberId, userId },
    select: MOBILE_NUMBER_SELECT,
  })
}

export function findByNumberForUser(
  userId: string,
  number: string
): Promise<MobileNumberRow | null> {
  return prisma.userMobileNumber.findFirst({
    where: { userId, number },
    select: MOBILE_NUMBER_SELECT,
  })
}

export function listByUser(userId: string): Promise<MobileNumberRow[]> {
  return prisma.userMobileNumber.findMany({
    where: { userId },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    select: MOBILE_NUMBER_SELECT,
  })
}

export type MobileNumberCreateData = {
  id: string
  userId: string
  number: string
  type: string
  isPrimary: boolean
  verificationStatus: string
  verificationId?: string | null
  verifiedAt?: bigint | null
  carrierName?: string | null
  lineType?: string | null
  createdAt: bigint
  updatedAt: bigint
}

export function create(data: MobileNumberCreateData): Promise<MobileNumberRow> {
  return prisma.userMobileNumber.create({
    data: {
      id: data.id,
      userId: data.userId,
      number: data.number,
      type: data.type,
      isPrimary: data.isPrimary,
      verificationStatus: data.verificationStatus,
      verificationId: data.verificationId ?? null,
      verifiedAt: data.verifiedAt ?? null,
      carrierName: data.carrierName ?? null,
      lineType: data.lineType ?? null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    },
    select: MOBILE_NUMBER_SELECT,
  })
}

export function updateMobileNumber(
  mobileNumberId: string,
  data: Partial<{
    type: string
    isPrimary: boolean
    verificationStatus: string
    verificationId: string | null
    verifiedAt: bigint | null
    carrierName: string | null
    lineType: string | null
    updatedAt: bigint
  }>
): Promise<MobileNumberRow> {
  return prisma.userMobileNumber.update({
    where: { id: mobileNumberId },
    data,
    select: MOBILE_NUMBER_SELECT,
  })
}

export function deleteMobileNumber(
  mobileNumberId: string
): Promise<MobileNumberRow> {
  return prisma.userMobileNumber.delete({
    where: { id: mobileNumberId },
    select: MOBILE_NUMBER_SELECT,
  })
}

export function clearPrimary(userId: string): Promise<{ count: number }> {
  return prisma.userMobileNumber.updateMany({
    where: { userId, isPrimary: true },
    data: { isPrimary: false },
  })
}

// ---- Verification ----

export function findVerificationById(
  verificationId: string
): Promise<VerificationRow | null> {
  return prisma.verification.findUnique({
    where: { id: verificationId },
    select: VERIFICATION_SELECT,
  })
}

export type VerificationCreateData = {
  id: string
  identifier: string
  value: string
  type: string
  expiresAt: bigint
  provider: string | null
  providerSid: string | null
  subjectType: string | null
  subjectId: string | null
  channel: string | null
  status: string | null
  attemptCount: number | null
  lastSentAt: bigint | null
  canResendAt: bigint | null
  verifiedAt?: bigint | null
  metadata?: unknown
  createdAt: bigint
  updatedAt: bigint
}

export function createVerification(
  data: VerificationCreateData
): Promise<VerificationRow> {
  return prisma.verification.create({
    data: {
      id: data.id,
      identifier: data.identifier,
      value: data.value,
      type: data.type,
      expiresAt: data.expiresAt,
      provider: data.provider,
      providerSid: data.providerSid,
      subjectType: data.subjectType,
      subjectId: data.subjectId,
      channel: data.channel,
      status: data.status,
      attemptCount: data.attemptCount,
      lastSentAt: data.lastSentAt,
      canResendAt: data.canResendAt,
      verifiedAt: data.verifiedAt ?? null,
      metadata: (data.metadata ?? {}) as never,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    },
    select: VERIFICATION_SELECT,
  })
}

export function updateVerification(
  verificationId: string,
  data: Partial<{
    status: string | null
    attemptCount: number | null
    verifiedAt: bigint | null
    updatedAt: bigint
  }>
): Promise<VerificationRow> {
  return prisma.verification.update({
    where: { id: verificationId },
    data,
    select: VERIFICATION_SELECT,
  })
}

// ---- User phone projection ----

export function findUserById(userId: string): Promise<{
  id: string
  phone: string | null
  phoneVerified: boolean
} | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, phone: true, phoneVerified: true },
  })
}

export function updateUserPhone(
  userId: string,
  data: { phone: string | null; phoneVerified: boolean; updatedAt: bigint }
): Promise<unknown> {
  return prisma.user.update({
    where: { id: userId },
    data: {
      phone: data.phone,
      phoneVerified: data.phoneVerified,
      updatedAt: data.updatedAt,
    },
  })
}

export function createAuditEvent(data: {
  id: string
  event: string
  source: string
  appName: string
  appId: string | null
  userId: string
  properties: Record<string, unknown>
  createdAt: bigint
}): Promise<unknown> {
  return prisma.auditEvent.create({
    data: {
      id: data.id,
      event: data.event,
      source: data.source,
      appName: data.appName,
      appId: data.appId,
      userId: data.userId,
      properties: data.properties as never,
      createdAt: data.createdAt,
    },
  })
}
