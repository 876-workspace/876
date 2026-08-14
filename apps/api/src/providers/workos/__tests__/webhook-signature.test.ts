import { createHmac } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { WorkOsWebhookVerifier } from '../webhook-signature'

const SECRET = 'whsec_test_2kL9mN4qR7wT4mB'
const NOW = 1_785_000_000

/** Build a valid `WorkOS-Signature` header for a body at a given timestamp. */
function signHeader(
  rawBody: string,
  timestamp: number,
  secret: string = SECRET
): string {
  const signature = createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`, 'utf8')
    .digest('hex')
  return `t=${timestamp}, v1=${signature}`
}

describe('WorkOsWebhookVerifier', () => {
  const body = '{"id":"event_1","event":"user.updated"}'

  it('verifies a correctly signed payload at the current time', () => {
    const verifier = new WorkOsWebhookVerifier({ secret: SECRET })

    const result = verifier.verify({
      rawBody: body,
      header: signHeader(body, NOW),
      nowSeconds: NOW,
    })

    expect(result).toBe(true)
  })

  it('verifies when the raw body is provided as a Buffer', () => {
    const verifier = new WorkOsWebhookVerifier({ secret: SECRET })

    const result = verifier.verify({
      rawBody: Buffer.from(body, 'utf8'),
      header: signHeader(body, NOW),
      nowSeconds: NOW,
    })

    expect(result).toBe(true)
  })

  it('rejects a payload signed with a different secret', () => {
    const verifier = new WorkOsWebhookVerifier({ secret: SECRET })

    const result = verifier.verify({
      rawBody: body,
      header: signHeader(body, NOW, 'whsec_wrong_secret'),
      nowSeconds: NOW,
    })

    expect(result).toBe(false)
  })

  it('rejects a tampered body whose signature no longer matches', () => {
    const verifier = new WorkOsWebhookVerifier({ secret: SECRET })
    const header = signHeader(body, NOW)

    const result = verifier.verify({
      rawBody: '{"id":"event_1","event":"user.deleted"}',
      header,
      nowSeconds: NOW,
    })

    expect(result).toBe(false)
  })

  it('rejects a timestamp older than the tolerance window (replay guard)', () => {
    const verifier = new WorkOsWebhookVerifier({
      secret: SECRET,
      toleranceSeconds: 300,
    })
    const oldTimestamp = NOW - 301

    const result = verifier.verify({
      rawBody: body,
      header: signHeader(body, oldTimestamp),
      nowSeconds: NOW,
    })

    expect(result).toBe(false)
  })

  it('accepts a timestamp at the edge of the tolerance window', () => {
    const verifier = new WorkOsWebhookVerifier({
      secret: SECRET,
      toleranceSeconds: 300,
    })
    const edgeTimestamp = NOW - 300

    const result = verifier.verify({
      rawBody: body,
      header: signHeader(body, edgeTimestamp),
      nowSeconds: NOW,
    })

    expect(result).toBe(true)
  })

  it('rejects a malformed header with no v1 signature', () => {
    const verifier = new WorkOsWebhookVerifier({ secret: SECRET })

    const result = verifier.verify({
      rawBody: body,
      header: `t=${NOW}`,
      nowSeconds: NOW,
    })

    expect(result).toBe(false)
  })

  it('rejects an undefined header', () => {
    const verifier = new WorkOsWebhookVerifier({ secret: SECRET })

    const result = verifier.verify({
      rawBody: body,
      header: undefined,
      nowSeconds: NOW,
    })

    expect(result).toBe(false)
  })

  it('rejects every request when the configured secret is empty', () => {
    const verifier = new WorkOsWebhookVerifier({ secret: '' })

    const result = verifier.verify({
      rawBody: body,
      header: signHeader(body, NOW, ''),
      nowSeconds: NOW,
    })

    expect(result).toBe(false)
  })

  it('rejects a non-integer timestamp in the header', () => {
    const verifier = new WorkOsWebhookVerifier({ secret: SECRET })
    const signature = createHmac('sha256', SECRET)
      .update(`not-a-number.${body}`, 'utf8')
      .digest('hex')

    const result = verifier.verify({
      rawBody: body,
      header: `t=not-a-number, v1=${signature}`,
      nowSeconds: NOW,
    })

    expect(result).toBe(false)
  })
})
