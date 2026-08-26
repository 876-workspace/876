import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * The parked capabilities must ship disabled.
 *
 * Asserted against the raw file rather than a parsed object: `wrangler.jsonc`
 * allows comments and trailing commas, and a hand-rolled JSONC parser trips
 * over the `//` inside a URL. What matters here is only that each key is
 * present with the string `"false"`, which the raw text answers exactly.
 */
const WRANGLER = readFileSync(
  fileURLToPath(new URL('../../../wrangler.jsonc', import.meta.url)),
  'utf8'
)

const PARKED = [
  'BILLING_LATE_FEES_ENABLED',
  'BILLING_DUNNING_ENABLED',
  'BILLING_PAYOUTS_ENABLED',
] as const

describe('wrangler feature flags', () => {
  it.each(PARKED)('ships %s disabled', (key) => {
    expect(WRANGLER).toMatch(new RegExp(`"${key}"\\s*:\\s*"false"`))
  })

  it.each(PARKED)('declares %s as a var, never a required secret', (key) => {
    // A secret cannot carry a default, so a parked switch declared as one
    // would fail deploy preflight for a capability nobody has enabled.
    const secretsBlock = WRANGLER.slice(WRANGLER.indexOf('"secrets"'))
    expect(secretsBlock).not.toContain(key)
  })

  it('leaves the existing sweep switch in place', () => {
    expect(WRANGLER).toMatch(/"BILLING_SWEEP_ENABLED"\s*:\s*"false"/)
  })

  it('uses string booleans, which is what the env parser reads', () => {
    // Wrangler vars are strings; a real JSON `false` would parse as the string
    // "false" anyway, but declaring it as a boolean invites the opposite
    // assumption in a future edit.
    for (const key of PARKED)
      expect(WRANGLER).not.toMatch(new RegExp(`"${key}"\\s*:\\s*false\\b`))
  })
})
