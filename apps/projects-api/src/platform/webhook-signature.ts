import { createHmac, timingSafeEqual } from 'node:crypto'

export const WEBHOOK_TIMEOUT_MS = 10_000
export const WEBHOOK_SIGNATURE_HEADER = 'x-876-signature'
export const WEBHOOK_SIGNATURE_TOLERANCE_SECONDS = 300

export type WebhookDeliveryResult = {
  status: number
  durationMs: number
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

export async function postWebhook(
  url: string,
  secret: string,
  payload: Record<string, unknown>,
  options?: { fetchImpl?: typeof fetch; now?: () => number }
): Promise<WebhookDeliveryResult> {
  const startedAt = Date.now()
  const timestamp = Math.floor((options?.now ?? Date.now)() / 1000)
  const body = JSON.stringify(payload)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS)
  try {
    const response = await (options?.fetchImpl ?? fetch)(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        [WEBHOOK_SIGNATURE_HEADER]: signWebhookBody(secret, timestamp, body),
      },
      body,
      signal: controller.signal,
    })
    return { status: response.status, durationMs: Date.now() - startedAt }
  } finally {
    clearTimeout(timeout)
  }
}
