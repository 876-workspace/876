import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'

import {
  signWebhookBody,
  verifyWebhookSignature,
  WEBHOOK_SIGNATURE_HEADER,
} from '../../../platform/webhook-signature.js'

describe('signWebhookBody', () => {
  it('matches a manually computed hmac', () => {
    const secret = 'endpoint-secret'
    const timestamp = 1_700_000_000
    const body = '{"object":"projects.webhook-event"}'
    const expected = `t=${timestamp},v1=${createHmac('sha256', secret)
      .update(`${timestamp}.${body}`, 'utf8')
      .digest('hex')}`
    expect(signWebhookBody(secret, timestamp, body)).toBe(expected)
  })

  it('binds the signature bytes to the exact body', () => {
    const first = signWebhookBody('secret', 100, '{"a":1}')
    const second = signWebhookBody('secret', 100, '{"a":2}')
    expect(first).not.toBe(second)
  })

  it('binds the signature bytes to the timestamp', () => {
    expect(signWebhookBody('secret', 100, '{}')).not.toBe(
      signWebhookBody('secret', 101, '{}')
    )
  })

  it('uses the shared signature header name', () => {
    expect(WEBHOOK_SIGNATURE_HEADER).toBe('x-876-signature')
  })
})

describe('verifyWebhookSignature', () => {
  const secret = 'endpoint-secret'
  const body = '{"deliveryId":"whdl_1"}'

  it('accepts a fresh signature', () => {
    const now = 1_700_000_000
    const header = signWebhookBody(secret, now, body)
    expect(verifyWebhookSignature(secret, header, body, now)).toBe(true)
  })

  it('rejects tampered bodies', () => {
    const now = 1_700_000_000
    const header = signWebhookBody(secret, now, body)
    expect(verifyWebhookSignature(secret, header, '{"deliveryId":"whdl_2"}', now)).toBe(
      false
    )
  })

  it('rejects wrong secrets', () => {
    const now = 1_700_000_000
    const header = signWebhookBody(secret, now, body)
    expect(verifyWebhookSignature('other-secret', header, body, now)).toBe(false)
  })

  it('rejects stale timestamps', () => {
    const header = signWebhookBody(secret, 1_700_000_000, body)
    expect(verifyWebhookSignature(secret, header, body, 1_700_000_000 + 301)).toBe(
      false
    )
  })

  it('rejects malformed headers', () => {
    expect(verifyWebhookSignature(secret, 'not-a-signature', body, 1)).toBe(false)
    expect(verifyWebhookSignature(secret, 't=abc,v1=deadbeef', body, 1)).toBe(false)
  })
})
