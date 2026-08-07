import { prisma } from '@/db/client'

/**
 * Every query against `communication_webhook_events`, plus the two
 * provider-SID lookups the callbacks resolve their subject by.
 */

export type WebhookEventData = {
  id: string
  provider: string
  eventType: string
  providerSid: string
  payloadHash: string
  signatureValid: boolean
  processedAt: bigint
  processingError: string | null
  createdAt: bigint
}

/**
 * Record the event, answering `false` when it has already been seen.
 *
 * The read and the write are not atomic, so the unique constraint on
 * `(provider_sid, event_type, payload_hash)` is treated as the real decision:
 * Twilio retries aggressively and two retries can land concurrently, and
 * without catching the violation one of them would 500 and be retried again.
 */
export async function recordEventIfNew(
  data: WebhookEventData
): Promise<boolean> {
  const existing = await prisma.communicationWebhookEvent.findFirst({
    where: {
      providerSid: data.providerSid,
      eventType: data.eventType,
      payloadHash: data.payloadHash,
    },
    select: { id: true },
  })
  if (existing) return false

  try {
    await prisma.communicationWebhookEvent.create({ data })
    return true
  } catch (error) {
    if (isUniqueViolation(error)) return false
    throw error
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === 'P2002'
  )
}

export function findMessageByProviderSid(
  providerSid: string
): Promise<{ id: string; status: string } | null> {
  return prisma.communicationMessage.findFirst({
    where: { providerSid },
    select: { id: true, status: true },
  })
}

export async function updateMessage(
  messageId: string,
  data: {
    status: string
    updatedAt: bigint
    deliveredAt?: bigint
    readAt?: bigint
    failedAt?: bigint
    providerErrorCode?: string | null
  }
): Promise<void> {
  await prisma.communicationMessage.update({ where: { id: messageId }, data })
}

export function findCallByProviderSid(
  providerSid: string
): Promise<{ id: string; status: string; startedAt: bigint | null } | null> {
  return prisma.communicationCall.findFirst({
    where: { providerSid },
    select: { id: true, status: true, startedAt: true },
  })
}

export async function updateCall(
  callId: string,
  data: {
    status: string
    updatedAt: bigint
    startedAt?: bigint
    completedAt?: bigint
    answeredAt?: bigint
    durationSeconds?: number
    providerErrorCode?: string | null
  }
): Promise<void> {
  await prisma.communicationCall.update({ where: { id: callId }, data })
}
