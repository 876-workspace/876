import { describe, expect, it, beforeEach, vi } from 'vitest'

describe('billing feature flags', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  async function loadWithEnv(env: Record<string, string | undefined>) {
    const { resetSettingsForTest } = await import('..')
    return resetSettingsForTest(env as NodeJS.ProcessEnv)
  }

  it('defaults all billing features to false when env is missing', async () => {
    const settings = await loadWithEnv({
      BILLING_DATABASE_URL: 'postgres://localhost/billing',
    })
    expect(settings.features.lateFees).toBe(false)
    expect(settings.features.dunning).toBe(false)
    expect(settings.features.payouts).toBe(false)
  })

  it('parses truthy values for BILLING_LATE_FEES_ENABLED', async () => {
    for (const val of ['1', 'true', 'TRUE', 'yes', 'YES', 'on', 'ON']) {
      const s = await loadWithEnv({
        BILLING_DATABASE_URL: 'postgres://localhost/billing',
        BILLING_LATE_FEES_ENABLED: val,
      })
      expect(s.features.lateFees, `value ${val}`).toBe(true)
    }
  })

  it('parses falsy values for BILLING_LATE_FEES_ENABLED', async () => {
    for (const val of ['0', 'false', 'no', 'off', '', undefined]) {
      const s = await loadWithEnv({
        BILLING_DATABASE_URL: 'postgres://localhost/billing',
        BILLING_LATE_FEES_ENABLED: val,
      })
      expect(s.features.lateFees, `value ${String(val)}`).toBe(false)
    }
  })

  it('trims and lowercases before comparing', async () => {
    const s = await loadWithEnv({
      BILLING_DATABASE_URL: 'postgres://localhost/billing',
      BILLING_LATE_FEES_ENABLED: '  True  ',
      BILLING_DUNNING_ENABLED: '  ON  ',
      BILLING_PAYOUTS_ENABLED: '  yes  ',
    })
    expect(s.features.lateFees).toBe(true)
    expect(s.features.dunning).toBe(true)
    expect(s.features.payouts).toBe(true)
  })

  it('parses each flag independently', async () => {
    const on = await loadWithEnv({
      BILLING_DATABASE_URL: 'postgres://localhost/billing',
      BILLING_LATE_FEES_ENABLED: 'true',
      BILLING_DUNNING_ENABLED: 'false',
      BILLING_PAYOUTS_ENABLED: '1',
    })
    expect(on.features.lateFees).toBe(true)
    expect(on.features.dunning).toBe(false)
    expect(on.features.payouts).toBe(true)

    const off = await loadWithEnv({
      BILLING_DATABASE_URL: 'postgres://localhost/billing',
      BILLING_LATE_FEES_ENABLED: 'false',
      BILLING_DUNNING_ENABLED: 'true',
      BILLING_PAYOUTS_ENABLED: '0',
    })
    expect(off.features.lateFees).toBe(false)
    expect(off.features.dunning).toBe(true)
    expect(off.features.payouts).toBe(false)
  })

  it('still parses WORKOS_VAULT_ENABLED via same booleanish helper', async () => {
    const enabled = await loadWithEnv({
      BILLING_DATABASE_URL: 'postgres://localhost/billing',
      WORKOS_VAULT_ENABLED: 'yes',
    })
    expect(enabled.workos.vaultEnabled).toBe(true)

    const disabled = await loadWithEnv({
      BILLING_DATABASE_URL: 'postgres://localhost/billing',
      WORKOS_VAULT_ENABLED: 'false',
    })
    expect(disabled.workos.vaultEnabled).toBe(false)
  })

  it('exposes features as a frozen object alongside other settings', async () => {
    const s = await loadWithEnv({
      BILLING_DATABASE_URL: 'postgres://localhost/billing',
      BILLING_LATE_FEES_ENABLED: 'true',
    })
    expect(Object.isFrozen(s)).toBe(true)
    expect(s.features).toEqual({
      lateFees: true,
      dunning: false,
      payouts: false,
    })
  })
})
