import { describe, expect, it } from 'vitest'
import { RESOURCE_MANIFEST, KNOWN_COLLISIONS } from './resource-manifest'

describe('ResourceManifest / contract / billing nouns exist', () => {
  it('defines paymentMethods as billing owned (diff coverage)', () => {
    // Arrange
    const entry = RESOURCE_MANIFEST.paymentMethods
    // Act & Assert
    expect(entry).toBeDefined()
    expect(entry.owner).toBe('billing')
    expect(entry.meaning.length).toBeGreaterThan(10)
    expect(entry.meaning).toMatch(/payment instrument/i)
  })

  it('defines paymentIntents as billing owned', () => {
    const entry = RESOURCE_MANIFEST.paymentIntents
    expect(entry.owner).toBe('billing')
    expect(entry.meaning).toMatch(/payment collection/i)
  })

  it('all manifest entries have owner and meaning (contract)', () => {
    for (const [name, entry] of Object.entries(RESOURCE_MANIFEST)) {
      expect(['core', 'billing', 'couriers', 'storage', 'widgets']).toContain(
        entry.owner
      )
      expect(entry.meaning.trim().length, `${name} meaning`).toBeGreaterThan(5)
    }
  })

  it('has no unresolved collisions (invariant)', () => {
    expect(KNOWN_COLLISIONS).toEqual([])
  })

  it('paymentMethods and paymentIntents are distinct nouns', () => {
    expect(RESOURCE_MANIFEST.paymentMethods.meaning).not.toBe(
      RESOURCE_MANIFEST.paymentIntents.meaning
    )
  })

  it('billing nouns are all owned by billing (ownership invariant)', () => {
    const billingNouns = [
      'customers',
      'products',
      'plans',
      'prices',
      'invoices',
      'payments',
      'paymentModes',
      'paymentMethods',
      'paymentIntents',
      'paymentProviders',
      'paymentTerms',
      'subscriptions',
      'taxRates',
      'bankAccounts',
    ] as const
    for (const noun of billingNouns) {
      const entry = (RESOURCE_MANIFEST as any)[noun]
      if (entry) expect(entry.owner, `${noun} owner`).toBe('billing')
    }
  })

  it('produces stable inline snapshot for payment nouns (golden master)', () => {
    expect({
      paymentMethods: RESOURCE_MANIFEST.paymentMethods,
      paymentIntents: RESOURCE_MANIFEST.paymentIntents,
    }).toMatchInlineSnapshot(`
      {
        "paymentIntents": {
          "meaning": "payment collection attempts",
          "owner": "billing",
        },
        "paymentMethods": {
          "meaning": "non-secret reusable payment instrument metadata",
          "owner": "billing",
        },
      }
    `)
  })
})
