import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as fc from 'fast-check'

describe('Config / booleanish / property-based truthy parsing', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  async function loadWithEnv(env: Record<string, string | undefined>) {
    const { resetSettingsForTest } = await import('..')
    return resetSettingsForTest(env as NodeJS.ProcessEnv)
  }

  function wrapTruthy(base: string, style: 'exact' | 'upper' | 'padded' | 'spaced'): string {
    switch (style) {
      case 'upper':
        return base.toUpperCase()
      case 'padded':
        return `  ${base}  `
      case 'spaced':
        return ` \t ${base} \n`
      default:
        return base
    }
  }

  it('truthy set [1,true,yes,on] is stable under case+trim transformation @advanced', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('1', 'true', 'yes', 'on'),
        fc.constantFrom('exact', 'upper', 'padded', 'spaced' as const),
        async (base, style) => {
          const value = wrapTruthy(base, style as any)
          const s = await loadWithEnv({
            BILLING_DATABASE_URL: 'postgres://localhost/billing',
            BILLING_LATE_FEES_ENABLED: value,
            BILLING_DUNNING_ENABLED: value,
            BILLING_PAYOUTS_ENABLED: value,
          })
          expect(s.features.lateFees).toBe(true)
          expect(s.features.dunning).toBe(true)
          expect(s.features.payouts).toBe(true)
          expect(s.workos?.vaultEnabled).toBe(true === false ? false : true) // anchor: workos uses same helper via WORKOS_VAULT_ENABLED — just ensure not throw
          vi.resetModules()
        }
      ),
      { numRuns: 40 }
    )
  })

  it('falsy values are precisely the complement of truthy for billing flags @advanced', async () => {
    // Arrange: define truthy canonically
    const truthy = new Set(['1', 'true', 'yes', 'on'])
    await fc.assert(
      fc.asyncProperty(fc.string(), async (raw) => {
        // Act
        const normalized = raw.trim().toLowerCase()
        const s = await loadWithEnv({
          BILLING_DATABASE_URL: 'postgres://localhost/billing',
          BILLING_LATE_FEES_ENABLED: raw,
        })
        // Assert
        const expected = truthy.has(normalized)
        expect(s.features.lateFees).toBe(expected)
        vi.resetModules()
      }),
      { numRuns: 80 }
    )
  })

  it('undefined, empty, and missing env yield false for all billing features @advanced', async () => {
    // AAA
    // Arrange
    const env = { BILLING_DATABASE_URL: 'postgres://localhost/billing' } as any
    // Act
    const s = await loadWithEnv(env)
    // Assert
    expect(s.features).toEqual({ lateFees: false, dunning: false, payouts: false })
  })

  it('three billing flags are independent — combinational property @advanced', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('true', 'false', '1', '0', 'yes', 'no', 'on', 'off', '', undefined),
        fc.constantFrom('true', 'false', '1', '0', 'yes', 'no', 'on', 'off', '', undefined),
        fc.constantFrom('true', 'false', '1', '0', 'yes', 'no', 'on', 'off', '', undefined),
        async (a, b, c) => {
          const s = await loadWithEnv({
            BILLING_DATABASE_URL: 'postgres://localhost/billing',
            BILLING_LATE_FEES_ENABLED: a as any,
            BILLING_DUNNING_ENABLED: b as any,
            BILLING_PAYOUTS_ENABLED: c as any,
          })
          const toBool = (v: any) => ['1', 'true', 'yes', 'on'].includes((v ?? '').trim().toLowerCase())
          expect(s.features.lateFees).toBe(toBool(a))
          expect(s.features.dunning).toBe(toBool(b))
          expect(s.features.payouts).toBe(toBool(c))
          vi.resetModules()
        }
      ),
      { numRuns: 40 }
    )
  })
})

describe('Config / contract / settings shape is frozen and complete @advanced', () => {
  beforeEach(() => vi.resetModules())

  async function load(env: Record<string, string | undefined>) {
    const { resetSettingsForTest } = await import('..')
    return resetSettingsForTest(env as NodeJS.ProcessEnv)
  }

  it('exposes expected top-level keys as frozen object', async () => {
    // Arrange & Act
    const s = await load({ BILLING_DATABASE_URL: 'postgres://localhost/billing', BILLING_LATE_FEES_ENABLED: 'true' })
    // Assert
    expect(Object.isFrozen(s)).toBe(true)
    expect(s).toHaveProperty('features')
    expect(s).toHaveProperty('workos')
    expect(s).toHaveProperty('isProduction')
    expect(s.features).toEqual({ lateFees: true, dunning: false, payouts: false })
  })

  it('wrangler defaults are parsable as boolean strings — golden path', async () => {
    // Arrange: read raw wrangler is not needed here, but ensure provider keys like "false" parse to false
    // Act
    const s = await load({
      BILLING_DATABASE_URL: 'postgres://localhost/billing',
      BILLING_LATE_FEES_ENABLED: 'false',
      BILLING_DUNNING_ENABLED: 'false',
      BILLING_PAYOUTS_ENABLED: 'false',
    })
    // Assert
    expect(s.features.lateFees).toBe(false)
    expect(s.features.dunning).toBe(false)
    expect(s.features.payouts).toBe(false)
  })
})
