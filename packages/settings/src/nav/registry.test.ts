import { describe, expect, it } from 'vitest'

import {
  defineSettingsNav,
  filterSettingsNav,
  resolveSettingsHref,
} from './registry'
import type { SettingsNavGroup, SettingsNavItem } from '../types'

const group: SettingsNavGroup = {
  key: 'operations',
  title: 'Operations',
  icon: 'truck',
  items: [
    {
      title: 'Deliveries',
      href: '/settings/deliveries',
      status: 'available',
      permission: 'deliveries.view',
    },
  ],
}

describe('defineSettingsNav', () => {
  it('validates and deeply freezes navigation', () => {
    const nav = defineSettingsNav([group])

    expect(nav).toEqual([group])
    expect(Object.isFrozen(nav)).toBe(true)
    expect(Object.isFrozen(nav[0])).toBe(true)
    expect(Object.isFrozen(nav[0]?.items)).toBe(true)
    expect(Object.isFrozen(nav[0]?.items[0])).toBe(true)
  })

  it('rejects duplicate group keys', () => {
    expect(() =>
      defineSettingsNav([
        { ...group, items: [...group.items] },
        { ...group, items: [...group.items] },
      ])
    ).toThrow('Duplicate settings nav group key: operations')
  })

  it('rejects duplicate item titles within a group', () => {
    expect(() =>
      defineSettingsNav([
        { ...group, items: [group.items[0]!, { ...group.items[0]! }] },
      ])
    ).toThrow('Duplicate settings nav item title in operations: Deliveries')
  })

  it('rejects an available item without href', () => {
    expect(() =>
      defineSettingsNav([
        {
          ...group,
          items: [{ title: 'Deliveries', status: 'available' }],
        },
      ])
    ).toThrow('Available settings nav item requires href: Deliveries')
  })

  it('rejects a planned item with href', () => {
    expect(() =>
      defineSettingsNav([
        {
          ...group,
          items: [
            {
              title: 'Deliveries',
              status: 'planned',
              href: '/settings/deliveries',
            },
          ],
        },
      ])
    ).toThrow('Planned settings nav item cannot have href: Deliveries')
  })
})

describe('filterSettingsNav', () => {
  it('keeps permitted and always-visible items', () => {
    const nav = [
      {
        ...group,
        items: [
          group.items[0]!,
          {
            title: 'General',
            href: '/settings',
            status: 'available' as const,
          },
        ],
      },
    ]

    expect(filterSettingsNav(nav, [])).toEqual([
      {
        ...group,
        items: [
          {
            title: 'General',
            href: '/settings',
            status: 'available',
          },
        ],
      },
    ])
  })

  it('drops a group emptied by permissions', () => {
    expect(filterSettingsNav([group], [])).toEqual([])
  })
})

describe('resolveSettingsHref', () => {
  it.each([
    [
      {
        title: 'Deliveries',
        href: '/settings/deliveries',
        status: 'available',
      },
      '/org/acme/settings/deliveries',
    ],
    [{ title: 'Deliveries', status: 'planned' }, undefined],
  ] satisfies Array<[SettingsNavItem, string | undefined]>)(
    'resolves an item href to $1',
    (item, expected) => {
      expect(resolveSettingsHref('acme', item)).toBe(expected)
    }
  )
})
