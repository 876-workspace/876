import { SETTINGS_HUB_ICON_KEYS } from '@876/ui/settings-hub'

import { SETTINGS_GROUPS } from './settings-nav'

describe('invoice settings navigation', () => {
  it('exports a non-empty settings list', () => {
    expect(SETTINGS_GROUPS.length).toBeGreaterThan(0)
  })

  it('gives every item a label and a supported icon key', () => {
    const items = SETTINGS_GROUPS.flatMap((group) => group.items)

    expect(items.every((item) => item.label.length > 0)).toBe(true)
    expect(
      items.every((item) => SETTINGS_HUB_ICON_KEYS.includes(item.icon))
    ).toBe(true)
  })

  it('does not expose an available item without a destination', () => {
    const availableItems = SETTINGS_GROUPS.flatMap(
      (group) => group.items
    ).filter((item) => item.availability === 'available')

    expect(availableItems.every((item) => Boolean(item.href))).toBe(true)
  })

  it('marks Users as an available destination', () => {
    const users = SETTINGS_GROUPS.flatMap((group) => group.items).find(
      (item) => item.label === 'Users'
    )

    expect(users).toMatchObject({
      availability: 'available',
      href: '/settings/users',
    })
  })

  it('uses unique group labels', () => {
    const labels = SETTINGS_GROUPS.map((group) => group.label)

    expect(new Set(labels).size).toBe(labels.length)
  })
})
