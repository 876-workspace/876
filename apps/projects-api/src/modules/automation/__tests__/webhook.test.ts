import { createHmac } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'

import {
  postWebhook,
  signWebhookBody,
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_TIMEOUT_MS,
  type WebhookRequest,
} from '../webhook.js'

describe('signWebhookBody', () => {
  it('signs the exact bytes "<timestamp>.<body>" with HMAC-SHA256', () => {
    const secret = 'rule-secret'
    const timestamp = 1787767200
    const body = '{"ruleId":"arl_1"}'

    const expected = `t=${timestamp},v1=${createHmac('sha256', secret)
      .update(`${timestamp}.${body}`, 'utf8')
      .digest('hex')}`

    expect(signWebhookBody(secret, timestamp, body)).toBe(expected)
  })

  it('produces different signatures for different timestamps', () => {
    expect(signWebhookBody('s', 1, '{}')).not.toBe(signWebhookBody('s', 2, '{}'))
  })
})

describe('postWebhook', () => {
  const payload = { ruleId: 'arl_1', trigger: 'work-item.created' }

  it('posts JSON with the signature header and returns the status', async () => {
    const transport = vi.fn(async (_req: WebhookRequest) => ({ status: 200 }))
    const now = () => 1787767200000

    const delivery = await postWebhook(
      'https://hooks.example.test/876',
      'rule-secret',
      payload,
      { transport, now }
    )

    expect(delivery.status).toBe(200)
    expect(delivery.durationMs).toBeGreaterThanOrEqual(0)
    expect(transport).toHaveBeenCalledTimes(1)
    const req = transport.mock.calls[0]?.[0]
    if (!req) throw new Error('transport was not called')
    expect(req.url).toBe('https://hooks.example.test/876')
    expect(req.method).toBe('POST')
    expect(req.headers['content-type']).toBe('application/json')
    const body = JSON.stringify(payload)
    expect(req.body).toBe(body)
    expect(req.headers[WEBHOOK_SIGNATURE_HEADER]).toBe(
      signWebhookBody('rule-secret', 1787767200, body)
    )
  })

  it('rejects when the endpoint is unreachable', async () => {
    const transport = vi.fn(async (): Promise<{ status: number }> => {
      throw new Error('down')
    })

    await expect(
      postWebhook('https://hooks.example.test/876', 's', payload, {
        transport,
      })
    ).rejects.toThrow('down')
  })

  it('rejects ssrf-blocked urls before calling the transport', async () => {
    const transport = vi.fn(async () => ({ status: 200 }))

    await expect(
      postWebhook('https://10.0.0.1/hook', 's', payload, { transport })
    ).rejects.toThrow('blocked-address')
    expect(transport).not.toHaveBeenCalled()
  })

  it('records the timeout budget as ten seconds', () => {
    expect(WEBHOOK_TIMEOUT_MS).toBe(10_000)
  })
})
