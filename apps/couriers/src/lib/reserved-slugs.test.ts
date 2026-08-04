import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { isReservedOrgSlug, RESERVED_ORG_SLUGS } from './reserved-slugs'

const appDirectory = fileURLToPath(new URL('../app', import.meta.url))

describe('reserved organization slugs', () => {
  /**
   * The guard that makes this safe over time. `/[orgSlug]` sits at the app
   * root, so any static root segment shadows an organization whose slug
   * matches it — and that organization's workspace becomes unreachable, with
   * no error anywhere. Reading the directory at test time means a root route
   * added months from now fails this test instead of silently taking a
   * customer offline. Never replace it with a second hardcoded list.
   */
  it('reserves every static root app segment', () => {
    const rootSegments = readdirSync(appDirectory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      // `[param]` is the dynamic segment itself and `(group)` route groups
      // contribute no URL segment, so neither can collide with a slug.
      .filter((name) => !name.startsWith('[') && !name.startsWith('('))

    expect(
      rootSegments.filter((segment) => !RESERVED_ORG_SLUGS.has(segment))
    ).toEqual([])
  })

  it('does not reserve the dynamic segment directory name itself', () => {
    expect(RESERVED_ORG_SLUGS.has('[orgSlug]')).toBe(false)
  })

  it('matches case-insensitively', () => {
    expect(isReservedOrgSlug('Login')).toBe(true)
    expect(isReservedOrgSlug('LOGIN')).toBe(true)
  })

  it('allows normal organization slugs', () => {
    expect(isReservedOrgSlug('island-logistics')).toBe(false)
  })
})
