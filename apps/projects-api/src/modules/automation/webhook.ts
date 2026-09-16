import { createHmac } from 'node:crypto'

export const WEBHOOK_TIMEOUT_MS = 10_000
export const WEBHOOK_SIGNATURE_HEADER = 'x-876-signature'

export type WebhookDelivery = {
  status: number
  durationMs: number
}

export function signWebhookBody(secret: string, timestamp: number, body: string): string {
  const signature = createHmac('sha256', secret)
    .update(`${timestamp}.${body}`, 'utf8')
    .digest('hex')
  return `t=${timestamp},v1=${signature}`
}

export async function postWebhook(
  url: string,
  secret: string,
  payload: Record<string, unknown>,
  options?: { fetchImpl?: typeof fetch; now?: () => number }
): Promise<WebhookDelivery> {
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
