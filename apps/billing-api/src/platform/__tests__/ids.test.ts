import { describe, expect, it } from 'vitest'

import { generateId } from '../ids'

describe('generateId', () => {
  it('generates a prefixed id for a known entity', () => {
    const id = generateId('PaymentMethod')
    expect(id).toMatch(/^pm_[0-9a-f]{32}$/)
  })

  it('maps known billing entities to their short prefixes', () => {
    expect(generateId('PaymentIntent')).toMatch(/^pi_[0-9a-f]{32}$/)
    expect(generateId('PaymentCredential')).toMatch(/^pcred_[0-9a-f]{32}$/)
    expect(generateId('Customer')).toMatch(/^cus_[0-9a-f]{32}$/)
    expect(generateId('Tenant')).toMatch(/^ten_[0-9a-f]{32}$/)
    expect(generateId('Price')).toMatch(/^prc_[0-9a-f]{32}$/)
    expect(generateId('Invoice')).toMatch(/^inv_[0-9a-f]{32}$/)
    expect(generateId('Payment')).toMatch(/^pay_[0-9a-f]{32}$/)
    expect(generateId('PaymentAttempt')).toMatch(/^patm_[0-9a-f]{32}$/)
  })

  it('falls back to the raw prefix when the entity is unknown', () => {
    const id = generateId('UnknownEntity')
    expect(id).toMatch(/^UnknownEntity_[0-9a-f]{32}$/)
  })

  it('generates unique ids on each call', () => {
    const a = generateId('PaymentMethod')
    const b = generateId('PaymentMethod')
    expect(a).not.toBe(b)
  })

  it('uses the billing short prefix for Payment (pay) not the core prefix (inv)', () => {
    const id = generateId('Payment')
    expect(id.startsWith('pay_')).toBe(true)
    expect(id.startsWith('inv_')).toBe(false)
  })

  it('lowercases are not normalized — prefix is taken as-is', () => {
    const id = generateId('paymentmethod')
    expect(id).toMatch(/^paymentmethod_[0-9a-f]{32}$/)
  })
})
