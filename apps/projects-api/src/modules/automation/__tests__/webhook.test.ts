import { createHmac } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'

import {
  postWebhook,
  signWebhookBody,
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_TIMEOUT_MS,
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
    const fetchImpl = vi.fn().mockResolvedValue({ status: 200 })
    const now = () => 1787767200000

    const delivery = await postWebhook(
      'https://hooks.example.test/876',
      'rule-secret',
      payload,
      { fetchImpl, now }
    )

    expect(delivery.status).toBe(200)
    expect(delivery.durationMs).toBeGreaterThanOrEqual(0)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }]
    expect(url).toBe('https://hooks.example.test/876')
    expect(init.method).toBe('POST')
    expect(init.headers['content-type']).toBe('application/json')
    const body = JSON.stringify(payload)
    expect(init.body).toBe(body)
    expect(init.headers[WEBHOOK_SIGNATURE_HEADER]).toBe(
      signWebhookBody('rule-secret', 1787767200, body)
    )
  })

  it('rejects when the endpoint is unreachable', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('down'))

    await expect(
      postWebhook('https://hooks.example.test/876', 's', payload, {
        fetchImpl,
      })
    ).rejects.toThrow('down')
  })

  it('aborts the request after the webhook timeout', async () => {
    vi.useFakeTimers()
    try {
      let seenSignal: AbortSignal | null = null
      const fetchImpl = vi.fn().mockImplementation((_url: string, init: { signal: AbortSignal }) => {
        seenSignal = init.signal
        return new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () =>
            reject(new Error('aborted'))
          )
        })
      })

      const pending = postWebhook('https://hooks.example.test/876', 's', payload, {
        fetchImpl,
      })
      pending.catch(() => {})
      await vi.advanceTimersByTimeAsync(WEBHOOK_TIMEOUT_MS)
      await expect(pending).rejects.toThrow('aborted')
      expect(seenSignal).not.toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('records the timeout budget as ten seconds', () => {
    expect(WEBHOOK_TIMEOUT_MS).toBe(10_000)
  })
})
