import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { isReservedOrgSlug, RESERVED_ORG_SLUGS } from '../reserved-slugs'

const appDirectory = resolve(process.cwd(), 'src/app')

describe('reserved organization slugs', () => {
  it('reserves every static root app segment', () => {
    const rootSegments = readdirSync(appDirectory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter(
        (name) =>
          !name.startsWith('[') &&
          !name.startsWith('(') &&
          !name.startsWith('_')
      )

    expect(
      rootSegments.filter((segment) => !RESERVED_ORG_SLUGS.has(segment))
    ).toEqual([])
  })

  it('reserves browser asset paths before they reach the workspace layout', () => {
    expect(isReservedOrgSlug('favicon.ico')).toBe(true)
    expect(isReservedOrgSlug('apple-touch-icon.png')).toBe(true)
  })

  it('allows a normal organization slug', () => {
    expect(isReservedOrgSlug('island-logistics')).toBe(false)
  })
})
