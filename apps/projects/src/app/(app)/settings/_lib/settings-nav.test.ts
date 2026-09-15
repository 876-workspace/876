import { SETTINGS_HUB_ICON_KEYS } from '@876/ui/settings-hub'
import { SETTINGS_GROUPS } from './settings-nav'

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
      '/settings/custom-fields',
      '/settings/phase-fields',
      '/settings/teams',
      '/settings/categories',
      '/settings/priorities',
      '/settings/users',
    ])
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
