import { createHmac, timingSafeEqual } from 'node:crypto'

import { z } from 'zod'

export const resendWebhookEventSchema = z.object({
  type: z.string(),
  created_at: z.string(),
  data: z
    .object({
      email_id: z.string().optional(),
      to: z.array(z.string()).optional(),
    })
    .passthrough(),
})

export type ResendWebhookEvent = z.infer<typeof resendWebhookEventSchema>

export type SvixWebhookHeaders = {
  id: string
  timestamp: string
  signature: string
}

export function verifySvixWebhook(input: {
  payload: string
  headers: SvixWebhookHeaders
  secret: string
  nowSeconds?: number
  toleranceSeconds?: number
}): boolean {
  const {
    payload,
    headers,
    secret,
    nowSeconds = Math.floor(Date.now() / 1000),
    toleranceSeconds = 300,
  } = input

  if (!secret.startsWith('whsec_')) return false

  const timestamp = Number(headers.timestamp)
  if (!Number.isSafeInteger(timestamp)) return false
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) return false

  const encodedSecret = secret.slice('whsec_'.length)
  let secretBytes: Buffer
  try {
    secretBytes = Buffer.from(encodedSecret, 'base64')
  } catch {
    return false
  }
  if (secretBytes.length === 0) return false

  const signedContent = `${headers.id}.${headers.timestamp}.${payload}`
  const expected = createHmac('sha256', secretBytes)
    .update(signedContent)
    .digest()

  return headers.signature.split(' ').some((candidate) => {
    const [version, encodedSignature] = candidate.split(',', 2)
    if (version !== 'v1' || !encodedSignature) return false

    let signature: Buffer
    try {
      signature = Buffer.from(encodedSignature, 'base64')
    } catch {
      return false
    }

    return signature.length === expected.length && timingSafeEqual(signature, expected)
  })
}

export function parseResendWebhook(payload: string): ResendWebhookEvent | null {
  try {
    const parsedJson: unknown = JSON.parse(payload)
    const parsed = resendWebhookEventSchema.safeParse(parsedJson)
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}
