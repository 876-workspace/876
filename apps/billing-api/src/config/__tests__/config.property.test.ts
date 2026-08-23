import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('Config / booleanish / property-based truthy parsing', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  async function loadWithEnv(env: Record<string, string | undefined>) {
    const { resetSettingsForTest } = await import('..')
    return resetSettingsForTest(env as NodeJS.ProcessEnv)
  }

  function wrapTruthy(
    base: string,
    style: 'exact' | 'upper' | 'padded' | 'spaced'
  ): string {
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
    // Arrange, Act, Assert — data-driven property without external library (guide 1.10 alternative)
    const truthyBases = ['1', 'true', 'yes', 'on'] as const
    const styles = ['exact', 'upper', 'padded', 'spaced'] as const
    for (const base of truthyBases) {
      for (const style of styles) {
        const value = wrapTruthy(base, style)
        const s = await loadWithEnv({
          BILLING_DATABASE_URL: 'postgres://localhost/billing',
          BILLING_LATE_FEES_ENABLED: value,
          BILLING_DUNNING_ENABLED: value,
          BILLING_PAYOUTS_ENABLED: value,
        })
        expect(s.features.lateFees, `${base}/${style}`).toBe(true)
        expect(s.features.dunning, `${base}/${style}`).toBe(true)
        expect(s.features.payouts, `${base}/${style}`).toBe(true)
        vi.resetModules()
      }
    }
  })

  it('falsy values are precisely the complement of truthy for billing flags @advanced', async () => {
    // Arrange: define truthy canonically
    const truthy = new Set(['1', 'true', 'yes', 'on'])
    const samples = [
      '0',
      'false',
      'no',
      'off',
      '',
      ' ',
      '  ',
      'TRUEISH',
      'yess',
      'onn',
      '2',
      'true false',
      '\t\n',
      'random',
      'Ja',
      'si',
    ]
    for (const raw of samples) {
      // Act
      const normalized = raw.trim().toLowerCase()
      const s = await loadWithEnv({
        BILLING_DATABASE_URL: 'postgres://localhost/billing',
        BILLING_LATE_FEES_ENABLED: raw,
      })
      // Assert
      const expected = truthy.has(normalized)
      expect(s.features.lateFees, `raw=${JSON.stringify(raw)}`).toBe(expected)
      vi.resetModules()
    }
    // exhaustive quick check: 50 random strings
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789 '
    for (let i = 0; i < 50; i++) {
      const len = Math.floor(Math.random() * 10) + 1
      let raw = ''
      for (let j = 0; j < len; j++)
        raw += chars.charAt(Math.floor(Math.random() * chars.length))
      const s = await loadWithEnv({
        BILLING_DATABASE_URL: 'postgres://localhost/billing',
        BILLING_LATE_FEES_ENABLED: raw,
      })
      const expected = truthy.has(raw.trim().toLowerCase())
      expect(s.features.lateFees, `random=${raw}`).toBe(expected)
      vi.resetModules()
    }
  })

  it('undefined, empty, and missing env yield false for all billing features @advanced', async () => {
    // AAA
    // Arrange
    const env = {
      BILLING_DATABASE_URL: 'postgres://localhost/billing',
    } as unknown as never
    // Act
    const s = await loadWithEnv(env)
    // Assert
    expect(s.features).toEqual({
      lateFees: false,
      dunning: false,
      payouts: false,
    })
  })

  it('three billing flags are independent — combinational property @advanced', async () => {
    const vals = [
      'true',
      'false',
      '1',
      '0',
      'yes',
      'no',
      'on',
      'off',
      '',
      undefined,
    ] as const
    const toBool = (v: string | undefined) =>
      ['1', 'true', 'yes', 'on'].includes((v ?? '').trim().toLowerCase())
    for (const a of vals) {
      for (const b of vals.slice(0, 3)) {
        for (const c of vals.slice(0, 3)) {
          const s = await loadWithEnv({
            BILLING_DATABASE_URL: 'postgres://localhost/billing',
            BILLING_LATE_FEES_ENABLED: a as unknown as never,
            BILLING_DUNNING_ENABLED: b as unknown as never,
            BILLING_PAYOUTS_ENABLED: c as unknown as never,
          })
          expect(s.features.lateFees, `a=${String(a)}`).toBe(toBool(a))
          expect(s.features.dunning, `b=${String(b)}`).toBe(toBool(b))
          expect(s.features.payouts, `c=${String(c)}`).toBe(toBool(c))
          vi.resetModules()
        }
      }
    }
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
    const s = await load({
      BILLING_DATABASE_URL: 'postgres://localhost/billing',
      BILLING_LATE_FEES_ENABLED: 'true',
    })
    // Assert
    expect(Object.isFrozen(s)).toBe(true)
    expect(s).toHaveProperty('features')
    expect(s).toHaveProperty('workos')
    expect(s).toHaveProperty('isProduction')
    expect(s.features).toEqual({
      lateFees: true,
      dunning: false,
      payouts: false,
    })
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
