import {
  parseResendWebhook,
  verifySvixWebhook,
} from './resend-webhook.js'

const vector = {
  secret: 'whsec_plJ3nmyCDGBKInavdOK15jsl',
  payload: '{"event_type":"ping","data":{"success":true}}',
  id: 'msg_loFOjxBNrRLzqYUf',
  timestamp: '1731705121',
  signature: 'v1,rAvfW3dJ/X/qxhsaXPOyyCGmRKsaKWcsNccKXlIktD0=',
}

describe('verifySvixWebhook', () => {
  it('accepts the published Svix verification vector', () => {
    expect(
      verifySvixWebhook({
        payload: vector.payload,
        headers: {
          id: vector.id,
          timestamp: vector.timestamp,
          signature: vector.signature,
        },
        secret: vector.secret,
        nowSeconds: 1731705121,
      })
    ).toBe(true)
  })

  it('rejects a changed signature', () => {
    expect(
      verifySvixWebhook({
        payload: vector.payload,
        headers: {
          id: vector.id,
          timestamp: vector.timestamp,
          signature: 'v1,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
        },
        secret: vector.secret,
        nowSeconds: 1731705121,
      })
    ).toBe(false)
  })

  it('rejects a changed payload', () => {
    expect(
      verifySvixWebhook({
        payload: `${vector.payload} `,
        headers: {
          id: vector.id,
          timestamp: vector.timestamp,
          signature: vector.signature,
        },
        secret: vector.secret,
        nowSeconds: 1731705121,
      })
    ).toBe(false)
  })

  it('rejects an expired timestamp', () => {
    expect(
      verifySvixWebhook({
        payload: vector.payload,
        headers: {
          id: vector.id,
          timestamp: vector.timestamp,
          signature: vector.signature,
        },
        secret: vector.secret,
        nowSeconds: 1731706000,
      })
    ).toBe(false)
  })

  it('rejects a timestamp too far in the future', () => {
    expect(
      verifySvixWebhook({
        payload: vector.payload,
        headers: {
          id: vector.id,
          timestamp: '1731706000',
          signature: vector.signature,
        },
        secret: vector.secret,
        nowSeconds: 1731705121,
      })
    ).toBe(false)
  })

  it('rejects a malformed timestamp', () => {
    expect(
      verifySvixWebhook({
        payload: vector.payload,
        headers: {
          id: vector.id,
          timestamp: 'not-a-time',
          signature: vector.signature,
        },
        secret: vector.secret,
        nowSeconds: 1731705121,
      })
    ).toBe(false)
  })

  it('rejects a secret without the Svix prefix', () => {
    expect(
      verifySvixWebhook({
        payload: vector.payload,
        headers: {
          id: vector.id,
          timestamp: vector.timestamp,
          signature: vector.signature,
        },
        secret: vector.secret.replace('whsec_', ''),
        nowSeconds: 1731705121,
      })
    ).toBe(false)
  })

  it('accepts a valid signature when another candidate is invalid', () => {
    expect(
      verifySvixWebhook({
        payload: vector.payload,
        headers: {
          id: vector.id,
          timestamp: vector.timestamp,
          signature: `v1,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA= ${vector.signature}`,
        },
        secret: vector.secret,
        nowSeconds: 1731705121,
      })
    ).toBe(true)
  })
})

describe('parseResendWebhook', () => {
  it('parses a Resend email event', () => {
    expect(
      parseResendWebhook(
        JSON.stringify({
          type: 'email.delivered',
          created_at: '2026-09-15T18:00:00.000Z',
          data: { email_id: 'email_1', to: ['jane@example.com'] },
        })
      )
    ).toMatchObject({
      type: 'email.delivered',
      data: { email_id: 'email_1' },
    })
  })

  it('rejects JSON that is not a Resend event', () => {
    expect(parseResendWebhook(JSON.stringify({ type: 'email.delivered' }))).toBeNull()
  })

  it('rejects malformed JSON', () => {
    expect(parseResendWebhook('{')).toBeNull()
  })
})
