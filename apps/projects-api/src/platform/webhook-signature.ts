import { createHmac, timingSafeEqual } from 'node:crypto'
import { request as httpsRequest } from 'node:https'
import { isIP } from 'node:net'

import {
  checkWebhookUrlSync,
  createSecureLookup,
  isBlockedAddress,
  type SecureResolver,
} from './ssrf.js'

export { createSecureLookup }

export const WEBHOOK_TIMEOUT_MS = 10_000
export const WEBHOOK_RESPONSE_MAX_BYTES = 64 * 1024
export const WEBHOOK_SIGNATURE_HEADER = 'x-876-signature'
export const WEBHOOK_SIGNATURE_TOLERANCE_SECONDS = 300

export type WebhookDeliveryResult = {
  status: number
  durationMs: number
}

export type WebhookRequest = {
  url: string
  method: 'POST'
  headers: Record<string, string>
  body: string
}

export type WebhookTransport = (
  req: WebhookRequest
) => Promise<{ status: number }>

export type PostWebhookOptions = {
  transport?: WebhookTransport
  now?: () => number
  resolver?: SecureResolver
  timeoutMs?: number
}

export function signWebhookBody(
  secret: string,
  timestamp: number,
  body: string
): string {
  const signature = createHmac('sha256', secret)
    .update(`${timestamp}.${body}`, 'utf8')
    .digest('hex')
  return `t=${timestamp},v1=${signature}`
}

export function verifyWebhookSignature(
  secret: string,
  header: string,
  body: string,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): boolean {
  const match = /^t=(\d+),v1=([0-9a-f]+)$/.exec(header.trim())
  if (!match) return false
  const timestamp = Number(match[1])
  if (
    !Number.isFinite(timestamp) ||
    Math.abs(nowSeconds - timestamp) > WEBHOOK_SIGNATURE_TOLERANCE_SECONDS
  )
    return false
  const expected = signWebhookBody(secret, timestamp, body)
  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(header.trim(), 'utf8')
  return a.length === b.length && timingSafeEqual(a, b)
}

function webhookBlockedError(reason: string): Error {
  const error = new Error(`webhook-url-blocked: ${reason}`)
  ;(error as { code?: string }).code = 'webhook-url-blocked'
  return error
}

function defaultWebhookTransport(
  req: WebhookRequest,
  opts: { resolver?: SecureResolver; timeoutMs?: number } = {}
): Promise<{ status: number }> {
  const sync = checkWebhookUrlSync(req.url)
  if (!sync.ok) return Promise.reject(webhookBlockedError(sync.reason))
  if (isIP(sync.bare) !== 0 && isBlockedAddress(sync.bare))
    return Promise.reject(webhookBlockedError('blocked-address'))
  const timeoutMs = opts.timeoutMs ?? WEBHOOK_TIMEOUT_MS
  const lookup = createSecureLookup(opts.resolver) as (
    hostname: string,
    options: object,
    callback: (
      err: Error | null,
      address: string,
      family: number
    ) => void
  ) => void

  return new Promise<{ status: number }>((resolve, reject) => {
    let settled = false
    const fail = (err: Error): void => {
      if (settled) return
      settled = true
      reject(err)
    }
    const succeed = (status: number): void => {
      if (settled) return
      settled = true
      resolve({ status })
    }
    let clientReq: ReturnType<typeof httpsRequest>
    try {
      clientReq = httpsRequest(
        req.url,
        {
          method: req.method,
          headers: req.headers,
          lookup,
        },
        (res) => {
          let bytes = 0
          const status = res.statusCode ?? 0
          res.on('data', (chunk: Buffer) => {
            bytes += chunk.length
            if (bytes > WEBHOOK_RESPONSE_MAX_BYTES) {
              res.destroy()
            }
          })
          res.on('end', () => succeed(status))
          // Destroying an oversized response emits `close` without `end` or
          // `error`; the status was already received, so settle on it.
          res.on('close', () => succeed(status))
          res.on('error', (err: Error) => {
            if (bytes > WEBHOOK_RESPONSE_MAX_BYTES) succeed(status)
            else fail(err)
          })
          res.resume()
        }
      )
    } catch (err) {
      fail(err instanceof Error ? err : new Error('webhook-request-failed'))
      return
    }
    clientReq.on('error', (err: Error) => fail(err))
    clientReq.setTimeout(timeoutMs, () => {
      clientReq.destroy(new Error('webhook-timeout'))
    })
    clientReq.write(req.body)
    clientReq.end()
  })
}

export async function postWebhook(
  url: string,
  secret: string,
  payload: Record<string, unknown>,
  options?: PostWebhookOptions
): Promise<WebhookDeliveryResult> {
  const startedAt = Date.now()
  const sync = checkWebhookUrlSync(url)
  if (!sync.ok) throw webhookBlockedError(sync.reason)
  if (isIP(sync.bare) !== 0 && isBlockedAddress(sync.bare))
    throw webhookBlockedError('blocked-address')
  const timestamp = Math.floor((options?.now ?? Date.now)() / 1000)
  const body = JSON.stringify(payload)
  const webhookReq: WebhookRequest = {
    url,
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'content-length': String(Buffer.byteLength(body)),
      [WEBHOOK_SIGNATURE_HEADER]: signWebhookBody(secret, timestamp, body),
    },
    body,
  }
  const transport =
    options?.transport ??
    ((r: WebhookRequest) =>
      defaultWebhookTransport(r, {
        resolver: options?.resolver,
        timeoutMs: options?.timeoutMs,
      }))
  const outcome = await transport(webhookReq)
  return { status: outcome.status, durationMs: Date.now() - startedAt }
}
