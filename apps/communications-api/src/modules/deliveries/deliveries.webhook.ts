import type { Request, Response } from 'express'

import { sendCommunicationsError } from '../../http/result.js'
import { generateId } from '../../platform/ids.js'
import { nowUnixSeconds, toDbUnixSeconds } from '../../platform/timestamps.js'
import {
  parseResendWebhook,
  verifySvixWebhook,
} from '../../providers/resend-webhook.js'
import * as repository from './deliveries.repository.js'

const STATUS_RANK: Record<string, number> = {
  queued: 0,
  sent: 1,
  delivered: 2,
  opened: 3,
  clicked: 4,
}

const EVENT_TRANSITIONS: Record<
  string,
  {
    status?: string
    timestampField?:
      | 'sentAt'
      | 'deliveredAt'
      | 'openedAt'
      | 'clickedAt'
      | 'bouncedAt'
      | 'complainedAt'
      | 'failedAt'
  }
> = {
  'email.sent': { status: 'sent', timestampField: 'sentAt' },
  'email.delivered': { status: 'delivered', timestampField: 'deliveredAt' },
  'email.opened': { status: 'opened', timestampField: 'openedAt' },
  'email.clicked': { status: 'clicked', timestampField: 'clickedAt' },
  'email.bounced': { status: 'bounced', timestampField: 'bouncedAt' },
  'email.complained': { status: 'complained', timestampField: 'complainedAt' },
  'email.failed': { status: 'failed', timestampField: 'failedAt' },
}

function resolveNextStatus(current: string, requested?: string): string | undefined {
  if (!requested) return undefined
  if (['bounced', 'complained', 'failed'].includes(requested)) return requested
  if (['bounced', 'complained', 'failed'].includes(current)) return undefined

  const currentRank = STATUS_RANK[current] ?? -1
  const requestedRank = STATUS_RANK[requested] ?? -1
  return requestedRank >= currentRank ? requested : undefined
}

export async function handleResendWebhook(req: Request, res: Response) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) return sendCommunicationsError(res, 'communications/invalid-webhook')

  if (!Buffer.isBuffer(req.body))
    return sendCommunicationsError(res, 'communications/invalid-webhook')

  const payload = req.body.toString('utf8')
  const id = req.header('svix-id')?.trim()
  const timestamp = req.header('svix-timestamp')?.trim()
  const signature = req.header('svix-signature')?.trim()
  if (!id || !timestamp || !signature)
    return sendCommunicationsError(res, 'communications/invalid-webhook')

  const valid = verifySvixWebhook({
    payload,
    headers: { id, timestamp, signature },
    secret,
  })
  if (!valid) return sendCommunicationsError(res, 'communications/invalid-webhook')

  const event = parseResendWebhook(payload)
  if (!event) return sendCommunicationsError(res, 'communications/invalid-webhook')

  const providerMessageId = event.data.email_id
  if (!providerMessageId) {
    return res.json({ data: { received: true, matched: false }, error: null })
  }

  const delivery = await repository.retrieveByProviderMessageId(providerMessageId)
  if (!delivery) {
    return res.json({ data: { received: true, matched: false }, error: null })
  }

  const transition = EVENT_TRANSITIONS[event.type] ?? {}
  const occurredAtMs = Date.parse(event.created_at)
  if (!Number.isFinite(occurredAtMs))
    return sendCommunicationsError(res, 'communications/invalid-webhook')

  const occurredAt = toDbUnixSeconds(Math.floor(occurredAtMs / 1000))
  const status = resolveNextStatus(delivery.status, transition.status)

  const result = await repository.recordProviderEvent({
    id: generateId('deliveryEvent'),
    deliveryId: delivery.id,
    providerEventId: id,
    provider: 'resend',
    type: event.type,
    occurredAt,
    metadata: {
      emailId: providerMessageId,
      ...(event.data.to ? { to: event.data.to } : {}),
    },
    ...(status ? { status } : {}),
    ...(transition.timestampField
      ? { timestampField: transition.timestampField }
      : {}),
    now: toDbUnixSeconds(nowUnixSeconds()),
  })

  return res.json({
    data: { received: true, matched: true, duplicate: !result.inserted },
    error: null,
  })
}
