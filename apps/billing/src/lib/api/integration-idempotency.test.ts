import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import {
  parseIntegrationCreateBody,
  requireCreateAttribution,
} from './integration-idempotency'

const productAccess = {
  tenant: { id: 'blten_1' },
  connection: { id: 'afc_1' },
  sourceAppId: 'rap_couriers',
  platformAdmin: false,
  response: null,
} as const

const platformAccess = {
  tenant: { id: 'blten_1' },
  connection: null,
  sourceAppId: null,
  platformAdmin: true,
  response: null,
} as const

describe('integration create attribution', () => {
  it('separates source references before strict domain parsing', () => {
    const parsed = parseIntegrationCreateBody(
      { name: 'Courier delivery', sourceExternalReference: 'delivery_1' },
      z.strictObject({ name: z.string() })
    )

    expect(parsed.response).toBeNull()
    expect(parsed.data).toEqual({
      params: { name: 'Courier delivery' },
      sourceExternalReference: 'delivery_1',
    })
  })

  it('requires product apps to send a bounded idempotency key', async () => {
    const result = requireCreateAttribution(
      new Request('https://billing.example.test'),
      productAccess,
      { amount: 100n },
      'payment_1'
    )

    expect(result.response?.status).toBe(400)
    expect(await result.response?.json()).toMatchObject({ data: null })
  })

  it('hashes semantically identical transformed payloads deterministically', () => {
    const first = requireCreateAttribution(
      new Request('https://billing.example.test', {
        headers: { 'Idempotency-Key': 'payment-create-1' },
      }),
      productAccess,
      { amount: 100n, nested: { currency: 'JMD', active: true } },
      'payment_1'
    )
    const second = requireCreateAttribution(
      new Request('https://billing.example.test', {
        headers: { 'Idempotency-Key': 'payment-create-1' },
      }),
      productAccess,
      { nested: { active: true, currency: 'JMD' }, amount: 100n },
      'payment_1'
    )

    expect(first.data?.sourcePayloadHash).toBe(second.data?.sourcePayloadHash)
    expect(first.data).toMatchObject({
      sourceAppId: 'rap_couriers',
      sourceExternalReference: 'payment_1',
      sourceIdempotencyKey: 'payment-create-1',
    })
  })

  it('keeps platform-admin creates native and rejects false attribution', () => {
    const native = requireCreateAttribution(
      new Request('https://billing.example.test'),
      platformAccess,
      { name: 'Native customer' },
      null
    )
    const attributed = requireCreateAttribution(
      new Request('https://billing.example.test'),
      platformAccess,
      { name: 'Native customer' },
      'external_1'
    )

    expect(native).toEqual({ data: null, response: null })
    expect(attributed.response?.status).toBe(422)
  })
})
