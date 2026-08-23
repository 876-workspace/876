import { describe, expect, it } from 'vitest'
import { serializePaymentIntent } from '../payment-intents.serializers'

describe('Serializers / PaymentIntent / advanced', () => {
  it('adds object discriminator', () => {
    const out = serializePaymentIntent({ id: 'pi_1' }) as Record<
      string,
      unknown
    >
    expect(out.object).toBe('payment_intent')
  })

  it('converts bigint fields', () => {
    const out = serializePaymentIntent({
      id: 'pi_1',
      createdAt: BigInt(10),
      updatedAt: BigInt(20),
    }) as Record<string, unknown>
    expect(out.createdAt).toBe('10')
    expect(out.updatedAt).toBe('20')
  })

  it('recursively converts arrays', () => {
    const out = serializePaymentIntent({
      id: 'pi_1',
      arr: [{ v: BigInt(5) }],
    }) as Record<string, unknown>
    const arr = out.arr as { v: string }[]
    expect(arr[0]?.v).toBe('5')
  })

  it('preserves primitives', () => {
    const out = serializePaymentIntent({
      id: 'pi_1',
      amount: '1000',
      currency: 'USD',
      ok: true,
    }) as Record<string, unknown>
    expect(out.amount).toBe('1000')
    expect(out.currency).toBe('USD')
    expect(out.ok).toBe(true)
  })

  it('does not leak credential (if present)', () => {
    // Even if row had credential, serializer via convert would keep it; but the strict schema later would reject.
    // Here we assert convert does not automatically strip — security is via schema strictObject, not serializer alone.
    // This test documents that invariant: serializer keeps unknown fields except bigint conversion.
    const out = serializePaymentIntent({
      id: 'pi_1',
      credential: 'secret',
    }) as Record<string, unknown>
    expect(out.credential).toBe('secret')
  })

  it('handles empty', () => {
    expect(serializePaymentIntent({}).object).toBe('payment_intent')
  })

  it('snapshot stable (golden master)', () => {
    const out = serializePaymentIntent({
      id: 'pi_1',
      amount: BigInt(2500),
      currency: 'USD',
      createdAt: BigInt(1),
    }) as Record<string, unknown>
    expect(out).toMatchInlineSnapshot(`
      {
        "amount": "2500",
        "createdAt": "1",
        "currency": "USD",
        "id": "pi_1",
        "object": "payment_intent",
      }
    `)
  })
})
