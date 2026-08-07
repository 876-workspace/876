import { createHash } from 'node:crypto'

import { generateId } from '@/platform/ids'
import { nowUnixSeconds } from '@/platform/timestamps'

import * as repository from './twilio-webhooks.repository'
import type { TwilioPayload } from './twilio-webhooks.schemas'

/**
 * Applying Twilio's status callbacks.
 *
 * Two properties matter more than anything else here, because Twilio retries
 * aggressively and delivers out of order: an identical payload must never be
 * applied twice, and a status must never move backwards.
 */

const STATUS_RANK: Record<string, number> = {
  queued: 10,
  accepted: 10,
  sent: 20,
  delivered: 30,
  read: 40,
}
const TERMINAL = new Set(['failed', 'undelivered'])

const CALL_STATUS_RANK: Record<string, number> = {
  queued: 10,
  initiated: 20,
  ringing: 30,
  'in-progress': 40,
  completed: 50,
}
const CALL_TERMINAL = new Set([
  'completed',
  'busy',
  'no-answer',
  'canceled',
  'failed',
])

const CALL_IN_FLIGHT = new Set(['initiated', 'ringing', 'in-progress'])

/**
 * Serialize exactly as Python's
 * `json.dumps(payload, sort_keys=True, separators=(",", ":"))` does.
 *
 * The hash is the deduplication key, so during a phased cutover both services
 * must derive the same digest from the same callback or a retry Twilio sends
 * after the switch would be processed a second time. `JSON.stringify` already
 * matches on key order (once sorted), separators, and control-character
 * escaping; the one difference is that Python's default `ensure_ascii=True`
 * escapes every non-ASCII character, which an inbound message body can easily
 * contain.
 */
function pythonJsonDumps(payload: TwilioPayload): string {
  const sorted: Record<string, string> = {}
  for (const key of Object.keys(payload).sort(compareByCodeUnit))
    sorted[key] = payload[key] as string

  // Python's encoder escapes everything outside printable ASCII, which is
  // `[^\x20-\x7e]`. Control characters below 0x20 are already escaped
  // identically by `JSON.stringify`, so only 0x7f and above are left — and DEL
  // is included, because Python escapes that too.
  return JSON.stringify(sorted).replace(
    /[\u007f-\uffff]/g,
    (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`
  )
}

function compareByCodeUnit(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

export function payloadHash(payload: TwilioPayload): string {
  return createHash('sha256').update(pythonJsonDumps(payload)).digest('hex')
}

/** Reject a lower-ranked update, and any update after a terminal outcome. */
export function shouldApplyStatus(current: string, incoming: string): boolean {
  if (TERMINAL.has(current)) return false
  if (TERMINAL.has(incoming)) return true

  return (STATUS_RANK[incoming] ?? 0) >= (STATUS_RANK[current] ?? 0)
}

export function shouldApplyCallStatus(
  current: string,
  incoming: string
): boolean {
  if (CALL_TERMINAL.has(current)) return false
  if (CALL_TERMINAL.has(incoming)) return true

  return (CALL_STATUS_RANK[incoming] ?? 0) >= (CALL_STATUS_RANK[current] ?? 0)
}

/**
 * Python's `int(value)` semantics, not JavaScript's.
 *
 * `Number.parseInt('12abc')` is 12 and `Number(' ')` is 0, where Python raises
 * on both. A lenient parse here would turn a malformed `CallDuration` into a
 * plausible-looking number and store it.
 */
function positiveInt(value: string | undefined): number | null {
  if (value === undefined) return null

  const trimmed = value.trim()
  if (!/^[+-]?\d+$/.test(trimmed)) return null

  const parsed = Number(trimmed)
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null
}

async function recordEvent(
  eventType: string,
  providerSid: string,
  payload: TwilioPayload,
  now: number
): Promise<boolean> {
  return repository.recordEventIfNew({
    id: generateId('webhookEvent'),
    provider: 'twilio',
    eventType,
    providerSid,
    payloadHash: payloadHash(payload),
    signatureValid: true,
    processedAt: BigInt(now),
    processingError: null,
    createdAt: BigInt(now),
  })
}

export async function applyMessageStatus(
  payload: TwilioPayload
): Promise<boolean> {
  const providerSid = payload.MessageSid || payload.SmsSid || ''
  if (!providerSid) return false

  const now = nowUnixSeconds()
  if (!(await recordEvent('message.status', providerSid, payload, now)))
    return false

  const message = await repository.findMessageByProviderSid(providerSid)
  const incoming = (payload.MessageStatus ?? '').toLowerCase()

  if (message && incoming && shouldApplyStatus(message.status, incoming)) {
    await repository.updateMessage(message.id, {
      status: incoming,
      updatedAt: BigInt(now),
      ...(incoming === 'delivered' ? { deliveredAt: BigInt(now) } : {}),
      ...(incoming === 'read' ? { readAt: BigInt(now) } : {}),
      ...(TERMINAL.has(incoming)
        ? {
            failedAt: BigInt(now),
            providerErrorCode: payload.ErrorCode || null,
          }
        : {}),
    })
  }

  return true
}

export async function applyCallStatus(
  payload: TwilioPayload
): Promise<boolean> {
  const providerSid = payload.CallSid || ''
  if (!providerSid) return false

  const now = nowUnixSeconds()
  if (!(await recordEvent('call.status', providerSid, payload, now)))
    return false

  const call = await repository.findCallByProviderSid(providerSid)
  const incoming = (payload.CallStatus ?? '').toLowerCase()

  if (call && incoming && shouldApplyCallStatus(call.status, incoming)) {
    const data: Parameters<typeof repository.updateCall>[1] = {
      status: incoming,
      updatedAt: BigInt(now),
    }

    // Only stamped once: a later `ringing` after `in-progress` must not move
    // the moment the call actually started.
    if (CALL_IN_FLIGHT.has(incoming) && call.startedAt === null)
      data.startedAt = BigInt(now)

    if (incoming === 'completed') {
      data.completedAt = BigInt(now)
      const duration = positiveInt(payload.CallDuration)
      if (duration !== null) {
        data.durationSeconds = duration
        // Twilio does not always send AnsweredAt; deriving it from the duration
        // is better than leaving an answered call with no answer time.
        data.answeredAt = BigInt(
          positiveInt(payload.AnsweredAt) || Math.max(0, now - duration)
        )
      }
    } else if (CALL_TERMINAL.has(incoming)) {
      data.completedAt = BigInt(now)
      data.providerErrorCode = payload.ErrorCode || null
    }

    await repository.updateCall(call.id, data)
  }

  return true
}

export async function recordInboundCall(
  payload: TwilioPayload
): Promise<boolean> {
  const providerSid = payload.CallSid || ''
  if (!providerSid) return false

  return recordEvent('call.inbound', providerSid, payload, nowUnixSeconds())
}
