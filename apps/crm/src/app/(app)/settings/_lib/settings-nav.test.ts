import { SETTINGS_ICON_RESOLVER } from '../_components/settings-group-card'
import { SETTINGS_GROUPS } from './settings-nav'

describe('settings navigation registry', () => {
  it('gives every available item an href and every planned item none', () => {
    const items = SETTINGS_GROUPS.flatMap((group) => group.items)

    expect(
      items.map(({ label, availability, href }) => ({
        label,
        availability,
        href,
      }))
    ).toEqual([
      {
        label: 'Teams',
        availability: 'available',
        href: '/settings/teams',
      },
      {
        label: 'Categories',
        availability: 'available',
        href: '/settings/categories',
      },
      { label: 'Statuses', availability: 'planned', href: undefined },
      {
        label: 'Automation rules',
        availability: 'planned',
        href: undefined,
      },
      { label: 'Email intake', availability: 'planned', href: undefined },
      { label: 'Members', availability: 'planned', href: undefined },
      { label: 'Preferences', availability: 'planned', href: undefined },
    ])
  })

  it('uses only string icon keys present in the resolver map', () => {
    const icons = SETTINGS_GROUPS.flatMap((group) =>
      group.items.map((item) => item.icon)
    )

    expect(icons.every((icon) => typeof icon === 'string')).toBe(true)
    expect(icons.every((icon) => icon in SETTINGS_ICON_RESOLVER)).toBe(true)
    expect(Object.keys(SETTINGS_ICON_RESOLVER).sort()).toEqual(
      [...new Set(icons)].sort()
    )
  })
})
