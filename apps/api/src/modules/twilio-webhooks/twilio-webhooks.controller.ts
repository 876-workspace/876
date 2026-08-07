import { timingSafeEqual } from 'node:crypto'

import type { Request, Response } from 'express'

import { getSettings } from '@/config'
import { AppHttpError } from '@/http/errors'
import {
  voiceTemplateSignature,
  voiceTemplateTwiml,
} from '@/modules/communications'
import { getWebhookVerifier } from '@/providers/twilio'

import type { TwilioPayload } from './twilio-webhooks.schemas'
import * as service from './twilio-webhooks.service'

/**
 * Twilio callbacks. The signature is the only credential, so it is checked
 * before anything is read out of the payload.
 */

const EMPTY_TWIML = '<Response/>'

function invalidSignature(): AppHttpError {
  return new AppHttpError({
    code: 'communications/invalid-webhook-signature',
    message: 'Invalid webhook signature.',
    httpStatus: 403,
  })
}

/**
 * Flatten the parsed form to the `str(key): str(value)` shape Twilio signed.
 *
 * `express.urlencoded({ extended: true })` can produce arrays or nested objects
 * for bracketed keys; Twilio does not send those, but coercing here means a
 * crafted body cannot reach the hash or the signature check as a non-string.
 */
function toPayload(body: unknown): TwilioPayload {
  if (typeof body !== 'object' || body === null) return {}

  const payload: TwilioPayload = {}
  for (const [key, value] of Object.entries(body))
    payload[key] = typeof value === 'string' ? value : String(value)

  return payload
}

/**
 * Verify the signature against the **configured** public URL.
 *
 * Only the path and query come from the request. Rebuilding the host from
 * `Host` or `X-Forwarded-Host` would let whoever set those headers choose the
 * string being signed, which is the entire attack this check exists to stop.
 */
function verify(req: Request, payload: TwilioPayload): void {
  const verifier = getWebhookVerifier()
  // A null verifier means the auth token or the public base URL is unset.
  // Every callback is then rejected: a permissive fallback would leave these
  // endpoints open to anyone who can reach them.
  if (!verifier) throw invalidSignature()

  const valid = verifier.validate({
    path: req.originalUrl,
    params: payload,
    signature: req.get('X-Twilio-Signature') ?? '',
  })
  if (!valid) throw invalidSignature()
}

function xml(res: Response, body: string): void {
  res.status(200).type('application/xml').send(body)
}

export async function messageStatus(
  req: Request,
  res: Response
): Promise<void> {
  const payload = toPayload(req.body)
  verify(req, payload)

  res.status(200).json({ processed: await service.applyMessageStatus(payload) })
}

export async function messageInbound(
  req: Request,
  res: Response
): Promise<void> {
  const payload = toPayload(req.body)
  verify(req, payload)

  // Inbound persistence is deliberately not implemented: the body is text a
  // member of the public wrote, and the platform does not retain it by default.
  res.status(200).json({ processed: true })
}

export async function callStatus(req: Request, res: Response): Promise<void> {
  const payload = toPayload(req.body)
  verify(req, payload)

  res.status(200).json({ processed: await service.applyCallStatus(payload) })
}

export async function callInbound(req: Request, res: Response): Promise<void> {
  const payload = toPayload(req.body)
  verify(req, payload)

  await service.recordInboundCall(payload)
  // Empty TwiML ends the call cleanly rather than leaving the caller connected
  // to an open line.
  xml(res, EMPTY_TWIML)
}

/**
 * Serve the TwiML for one platform-owned template.
 *
 * Two independent gates: Twilio's signature proves the request came from
 * Twilio, and the `signature` query parameter — an HMAC of the template key
 * under the auth token, computed when the call was placed — proves the key was
 * not swapped afterwards. The response never derives from caller input, so
 * there is no way to make 876 read out arbitrary text.
 */
export async function voiceTwiml(req: Request, res: Response): Promise<void> {
  const payload = toPayload(req.body)
  verify(req, payload)

  const templateKey = queryValue(req.query.template_key)
  const signature = queryValue(req.query.signature)
  const twiml = voiceTemplateTwiml(templateKey)

  const expected = voiceTemplateSignature(
    getSettings().twilio.authToken,
    templateKey
  )
  if (!templateKey || !twiml || !constantTimeEquals(signature, expected))
    throw new AppHttpError({
      code: 'communications/invalid-template',
      message: 'The requested voice template is unavailable.',
      httpStatus: 400,
    })

  xml(res, twiml)
}

function queryValue(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/** Constant-time comparison that tolerates unequal lengths. */
function constantTimeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8')
  const right = Buffer.from(b, 'utf8')
  if (left.length !== right.length) {
    // Still do a comparison of equal length so the failure costs the same time.
    timingSafeEqual(left, left)
    return false
  }

  return timingSafeEqual(left, right)
}
