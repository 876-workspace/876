import { describe, expect, it } from 'vitest'

import { COURIERS_MODULE_CATALOG } from '@/lib/modules'

import { SETTINGS_NAV } from './settings-groups'

/**
 * `settings-groups.ts` is deliberately hand-written: every nav item is a
 * literal so the whole navigation can be edited in one file. That removes the
 * import of `COURIERS_MODULE_CATALOG` which previously made a bad module key
 * impossible to write, so these tests take over that job.
 *
 * `.claude/rules/module-settings.md` requires exactly this guard: "Add a test
 * asserting the two catalogs cannot drift — that test is the only thing that
 * keeps them aligned over time."
 */
describe('SETTINGS_NAV', () => {
  const items = SETTINGS_NAV.flatMap((group) => group.items)
  const moduleItems = items.filter((item) => item.module !== undefined)
  const catalogKeys = new Set(COURIERS_MODULE_CATALOG.map((m) => m.key))

  it('names a module key that exists in the module catalog', () => {
    const unknown = moduleItems
      .map((item) => item.module)
      .filter((key) => !catalogKeys.has(key!))

    expect(unknown).toEqual([])
  })

  it('covers every catalog module except general, which has its own page', () => {
    const navModuleKeys = new Set(moduleItems.map((item) => item.module))
    const missing = [...catalogKeys].filter(
      (key) => key !== 'general' && !navModuleKeys.has(key)
    )

    expect(missing).toEqual([])
  })

  it('derives each module item href, permission and module from one key', () => {
    for (const item of moduleItems) {
      expect(item.href).toBe(`/settings/modules/${item.module}`)
      expect(item.permission).toBe(`${item.module}.view`)
    }
  })

  it('titles every module item "<Module> settings", never the bare label', () => {
    const labelByKey = new Map(
      COURIERS_MODULE_CATALOG.map((m) => [m.key, m.label])
    )

    for (const item of moduleItems) {
      expect(item.title).toBe(`${labelByKey.get(item.module!)} settings`)
    }
  })

  it('gives every available item an href and no planned item one', () => {
    for (const item of items) {
      if (item.status === 'available') expect(item.href).toBeTruthy()
      else expect(item.href).toBeUndefined()
    }
  })

  it('has no duplicate href across the whole navigation', () => {
    const hrefs = items.flatMap((item) => (item.href ? [item.href] : []))

    expect(hrefs).toHaveLength(new Set(hrefs).size)
  })

  it('has no duplicate group key', () => {
    const keys = SETTINGS_NAV.map((group) => group.key)

    expect(keys).toHaveLength(new Set(keys).size)
  })
})
