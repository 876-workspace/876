import { describe, expect, it } from 'vitest'
import { serializePaymentMethod } from '../payment-methods.serializers'

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pm_1',
    tenantId: 'ten_1',
    customerId: 'cus_1',
    type: 'CARD',
    status: 'ACTIVE',
    createdAt: BigInt(123),
    updatedAt: BigInt(456),
    credential: { sealed: 'secret' },
    ...overrides,
  }
}

describe('Serializers / PaymentMethod / advanced', () => {
  it('adds object discriminator (contract)', () => {
    // Arrange
    const input = row()
    // Act
    const out = serializePaymentMethod(input) as Record<string, unknown>
    // Assert
    expect(out.object).toBe('payment_method')
  })

  it('strips credential field (security invariant)', () => {
    const out = serializePaymentMethod(row({ credential: { a: 1 } })) as Record<
      string,
      unknown
    >
    expect(out.credential).toBeUndefined()
  })

  it('converts bigint to string (Prisma bigint handling)', () => {
    const out = serializePaymentMethod(
      row({ createdAt: BigInt(999), updatedAt: BigInt(1000) })
    ) as Record<string, unknown>
    expect(out.createdAt).toBe('999')
    expect(out.updatedAt).toBe('1000')
  })

  it('recursively converts nested bigints', () => {
    const out = serializePaymentMethod({
      id: 'pm_1',
      items: [{ v: BigInt(1) }, { v: BigInt(2) }],
    }) as Record<string, unknown>
    const items = out.items as { v: string }[]
    expect(items[0]?.v).toBe('1')
    expect(items[1]?.v).toBe('2')
  })

  it('preserves primitives (black-box)', () => {
    const out = serializePaymentMethod({
      id: 'pm_1',
      active: true,
      n: 3,
      s: 'hi',
      nil: null,
    }) as Record<string, unknown>
    expect(out.active).toBe(true)
    expect(out.n).toBe(3)
    expect(out.s).toBe('hi')
    expect(out.nil).toBeNull()
  })

  it('handles empty object (edge)', () => {
    const out = serializePaymentMethod({}) as Record<string, unknown>
    expect(out.object).toBe('payment_method')
  })

  it('produces stable snapshot for realistic row (golden master)', () => {
    const out = serializePaymentMethod(
      row({ card: { brand: 'visa', last4: '4242' } })
    ) as Record<string, unknown>
    expect(out).toMatchInlineSnapshot(`
      {
        "card": {
          "brand": "visa",
          "last4": "4242",
        },
        "createdAt": "123",
        "customerId": "cus_1",
        "id": "pm_1",
        "object": "payment_method",
        "status": "ACTIVE",
        "tenantId": "ten_1",
        "type": "CARD",
        "updatedAt": "456",
      }
    `)
  })
})
