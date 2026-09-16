import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'

import { SETTINGS_HUB_ICON_KEYS } from '@876/ui/settings-hub'
import { SETTINGS_GROUPS } from './settings-nav'

/** `src/app/(app)/settings/` — where an advertised href has to land. */
const SETTINGS_DIRECTORY = path.join(process.cwd(), 'src/app/(app)/settings')

/**
 * A segment has a page when it has one directly, or inside a route group —
 * `/settings/users` is served by `users/(list)/page.tsx`.
 */
function hasPage(directory: string): boolean {
  if (!existsSync(directory)) return false

  return readdirSync(directory, { withFileTypes: true }).some(
    (entry) =>
      entry.isDirectory() &&
      /^\(.+\)$/.test(entry.name) &&
      existsSync(path.join(directory, entry.name, 'page.tsx'))
  )
}

function advertisedHrefs(): string[] {
  return SETTINGS_GROUPS.flatMap((group) =>
    group.items.flatMap((item) => (item.href ? [item.href] : []))
  )
}

describe('settings navigation registry', () => {
  // The rule this guards is in `.claude/rules/module-settings.md`: a `planned`
  // item renders as plain text and must not carry an href, so the full
  // information architecture can ship before every page exists — without dead
  // links. Asserted as an invariant rather than against a literal inventory, so
  // adding a settings page does not fail a test that was never about inventory.
  it('gives every available item an href and every planned item none', () => {
    const items = SETTINGS_GROUPS.flatMap((group) => group.items)

    expect(items.length).toBeGreaterThan(0)
    for (const item of items) {
      if (item.availability === 'available')
        expect(
          item.href,
          `${item.label} is available and must link somewhere`
        ).toEqual(expect.stringMatching(/^\/settings\//))
      else
        expect(
          item.href,
          `${item.label} is planned and must not link anywhere`
        ).toBeUndefined()
    }
  })

  it('lists every settings destination exactly once', () => {
    const hrefs = SETTINGS_GROUPS.flatMap((group) =>
      group.items.map((item) => item.href).filter(Boolean)
    )

    expect(new Set(hrefs).size).toBe(hrefs.length)
  })

  it('exposes the settings pages that are built today', () => {
    const available = SETTINGS_GROUPS.flatMap((group) =>
      group.items.filter((item) => item.availability === 'available')
    ).map((item) => item.href)

    expect(available).toEqual([
      '/settings/work-item-types',
      '/settings/workflow-states',
      '/settings/workflows',
      '/settings/custom-fields',
      '/settings/phase-fields',
      '/settings/project-fields',
      '/settings/layouts',
      '/settings/custom-modules',
      '/settings/dashboard',
      '/settings/templates',
      '/settings/automation',
      '/settings/users',
      '/settings/capacity',
      '/settings/integrations',
      '/settings/webhooks',
      '/settings/imports',
      '/settings/health',
    ])
  })

  it('advertises a page for every href it offers', () => {
    const hrefs = advertisedHrefs()

    expect(hrefs.length).toBeGreaterThan(0)
    for (const href of hrefs) {
      const directory = path.join(
        SETTINGS_DIRECTORY,
        href.replace(/^\/settings\//, '')
      )
      expect(
        existsSync(path.join(directory, 'page.tsx')) || hasPage(directory),
        `${href} is advertised but has no page`
      ).toBe(true)
    }
  })

  it('no longer advertises teams, categories or priorities as built', () => {
    const items = SETTINGS_GROUPS.flatMap((group) => group.items)

    for (const label of ['Teams', 'Categories', 'Priorities']) {
      const item = items.find((candidate) => candidate.label === label)
      expect(item, `${label} is missing from the registry`).toBeDefined()
      expect(item?.availability).toBe('planned')
      expect(item?.href).toBeUndefined()
    }
  })

  it('uses only string icon keys supported by the shared settings hub', () => {
    const icons = SETTINGS_GROUPS.flatMap((group) =>
      group.items.map((item) => item.icon)
    )

    expect(icons.every((icon) => typeof icon === 'string')).toBe(true)
    expect(icons.every((icon) => SETTINGS_HUB_ICON_KEYS.includes(icon))).toBe(
      true
    )
  })
})
