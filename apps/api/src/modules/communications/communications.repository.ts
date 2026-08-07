import type { Prisma } from '@/db'
import { prisma } from '@/db/client'
import { paginateByCursor, type PaginationQuery } from '@/http/envelope'

import type {
  CallRow,
  MessageRow,
  PhoneLookupRow,
} from './communications.serializers'

/**
 * Every query against `communication_phone_lookups`, `communication_messages`,
 * and `communication_calls`.
 */

const LOOKUP_SELECT = {
  number: true,
  valid: true,
  e164: true,
  nationalFormat: true,
  countryCode: true,
  carrierName: true,
  lineType: true,
  mobileCountryCode: true,
  mobileNetworkCode: true,
  lineTypeRequested: true,
  createdAt: true,
} as const

const MESSAGE_SELECT = {
  id: true,
  provider: true,
  providerSid: true,
  channel: true,
  direction: true,
  status: true,
  toNumber: true,
  fromNumber: true,
  messagingServiceSid: true,
  contentSid: true,
  bodyPreview: true,
  bodyHash: true,
  userId: true,
  organizationId: true,
  appId: true,
  clientReference: true,
  idempotencyKey: true,
  providerErrorCode: true,
  sentAt: true,
  deliveredAt: true,
  readAt: true,
  failedAt: true,
  createdAt: true,
  updatedAt: true,
} as const

const CALL_SELECT = {
  id: true,
  provider: true,
  providerSid: true,
  direction: true,
  status: true,
  toNumber: true,
  fromNumber: true,
  templateKey: true,
  userId: true,
  organizationId: true,
  appId: true,
  clientReference: true,
  idempotencyKey: true,
  durationSeconds: true,
  providerErrorCode: true,
  startedAt: true,
  answeredAt: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
} as const

/* -------------------------------- lookups -------------------------------- */

export function findLookup(number: string): Promise<PhoneLookupRow | null> {
  return prisma.communicationPhoneLookup.findUnique({
    where: { number },
    select: LOOKUP_SELECT,
  })
}

export type LookupSaveData = {
  number: string
  valid: boolean
  e164: string | null
  nationalFormat: string | null
  countryCode: string | null
  carrierName: string | null
  lineType: string | null
  mobileCountryCode: string | null
  mobileNetworkCode: string | null
  lineTypeRequested: boolean
  createdAt: bigint
}

/**
 * The cache row is keyed by the number itself, so a refresh overwrites rather
 * than accumulating one row per query — this is a cost control, and a growing
 * table of stale rows would defeat it.
 */
export function saveLookup(data: LookupSaveData): Promise<PhoneLookupRow> {
  const { number, ...rest } = data

  return prisma.communicationPhoneLookup.upsert({
    where: { number },
    create: data,
    update: rest,
    select: LOOKUP_SELECT,
  })
}

/* -------------------------------- messages ------------------------------- */

export function findMessage(messageId: string): Promise<MessageRow | null> {
  return prisma.communicationMessage.findUnique({
    where: { id: messageId },
    select: MESSAGE_SELECT,
  })
}

export function findMessageByIdempotency(
  scope: string,
  key: string
): Promise<MessageRow | null> {
  return prisma.communicationMessage.findUnique({
    where: {
      idempotencyScope_idempotencyKey: {
        idempotencyScope: scope,
        idempotencyKey: key,
      },
    },
    select: MESSAGE_SELECT,
  })
}

export function createMessage(
  data: Prisma.CommunicationMessageUncheckedCreateInput
): Promise<MessageRow> {
  return prisma.communicationMessage.create({ data, select: MESSAGE_SELECT })
}

export function updateMessage(
  messageId: string,
  data: Prisma.CommunicationMessageUncheckedUpdateInput
): Promise<MessageRow> {
  return prisma.communicationMessage.update({
    where: { id: messageId },
    data,
    select: MESSAGE_SELECT,
  })
}

export function countMessages(status?: string): Promise<number> {
  return prisma.communicationMessage.count({
    where: status ? { status } : {},
  })
}

export function listMessages(
  query: PaginationQuery,
  status?: string
): Promise<{ data: MessageRow[]; hasMore: boolean }> {
  const where = status ? { status } : {}

  return paginateByCursor<MessageRow>({
    query,
    loadAnchor: (id) => findMessage(id),
    cursorOf: (row) => row.createdAt,
    fetch: ({ take, cursor, order }) =>
      prisma.communicationMessage.findMany({
        where: cursor
          ? {
              AND: [where, { createdAt: { [cursor.direction]: cursor.value } }],
            }
          : where,
        orderBy: { createdAt: order },
        take,
        select: MESSAGE_SELECT,
      }),
  })
}

/* --------------------------------- calls --------------------------------- */

export function findCall(callId: string): Promise<CallRow | null> {
  return prisma.communicationCall.findUnique({
    where: { id: callId },
    select: CALL_SELECT,
  })
}

export function findCallByIdempotency(
  scope: string,
  key: string
): Promise<CallRow | null> {
  return prisma.communicationCall.findUnique({
    where: {
      idempotencyScope_idempotencyKey: {
        idempotencyScope: scope,
        idempotencyKey: key,
      },
    },
    select: CALL_SELECT,
  })
}

export function createCall(
  data: Prisma.CommunicationCallUncheckedCreateInput
): Promise<CallRow> {
  return prisma.communicationCall.create({ data, select: CALL_SELECT })
}

export function updateCall(
  callId: string,
  data: Prisma.CommunicationCallUncheckedUpdateInput
): Promise<CallRow> {
  return prisma.communicationCall.update({
    where: { id: callId },
    data,
    select: CALL_SELECT,
  })
}

export function countCalls(status?: string): Promise<number> {
  return prisma.communicationCall.count({ where: status ? { status } : {} })
}

export function listCalls(
  query: PaginationQuery,
  status?: string
): Promise<{ data: CallRow[]; hasMore: boolean }> {
  const where = status ? { status } : {}

  return paginateByCursor<CallRow>({
    query,
    loadAnchor: (id) => findCall(id),
    cursorOf: (row) => row.createdAt,
    fetch: ({ take, cursor, order }) =>
      prisma.communicationCall.findMany({
        where: cursor
          ? {
              AND: [where, { createdAt: { [cursor.direction]: cursor.value } }],
            }
          : where,
        orderBy: { createdAt: order },
        take,
        select: CALL_SELECT,
      }),
  })
}
