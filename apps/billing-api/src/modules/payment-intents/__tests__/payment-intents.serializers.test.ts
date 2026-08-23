import { describe, expect, it } from 'vitest'

import { serializePaymentIntent } from '../payment-intents.serializers'

describe('serializePaymentIntent', () => {
  it('adds object discriminator', () => {
    const out = serializePaymentIntent({ id: 'pi_1', amount: 1000 }) as Record<
      string,
      unknown
    >
    expect(out.object).toBe('payment_intent')
    expect(out.id).toBe('pi_1')
  })

  it('converts bigints to strings', () => {
    const out = serializePaymentIntent({
      id: 'pi_1',
      amount: BigInt(5000),
      createdAt: BigInt(123),
    }) as Record<string, unknown>
    expect(out.amount).toBe('5000')
    expect(out.createdAt).toBe('123')
  })

  it('recursively converts nested structures', () => {
    const out = serializePaymentIntent({
      id: 'pi_1',
      nested: { value: BigInt(42), arr: [BigInt(1), BigInt(2)] },
    }) as Record<string, unknown>
    expect(out.nested.value).toBe('42')
    expect(out.nested.arr[0]).toBe('1')
  })

  it('preserves non-bigint values', () => {
    const out = serializePaymentIntent({
      id: 'pi_1',
      currency: 'USD',
      active: true,
      nil: null,
    }) as Record<string, unknown>
    expect(out.currency).toBe('USD')
    expect(out.active).toBe(true)
    expect(out.nil).toBeNull()
  })

  it('handles empty input', () => {
    const out = serializePaymentIntent({}) as Record<string, unknown>
    expect(out.object).toBe('payment_intent')
  })
})
