import { describe, expect, it } from 'vitest'

import { SETTINGS_HUB_ICON_KEYS } from '@876/ui/settings-hub'

import { BILLING_SETTINGS_SECTIONS } from '@/components/shell/nav-config'
import type { Permission } from '@/types/access'

import {
  declaredSettingsHrefs,
  groupedSettingsHrefs,
  iconKeyedSettingsHrefs,
  toSettingsHubGroups,
} from './settings-hub-groups'

function sectionsFor(hrefs: string[]) {
  return BILLING_SETTINGS_SECTIONS.filter((section) =>
    hrefs.includes(section.href)
  )
}

const ALL_SECTIONS = sectionsFor(declaredSettingsHrefs())

describe('settings hub coverage', () => {
  // The binding test: the navigation catalog decides which settings pages exist,
  // and this module decides how they are grouped and iconed. If the two drift, a
  // real settings page keeps working in the sidebar while silently vanishing
  // from the hub — a failure nothing else would catch.
  it('places every declared settings section in a group', () => {
    expect(groupedSettingsHrefs().sort()).toEqual(
      declaredSettingsHrefs().sort()
    )
  })

  it('gives every declared settings section an icon key', () => {
    expect(iconKeyedSettingsHrefs().sort()).toEqual(
      declaredSettingsHrefs().sort()
    )
  })

  it('uses only icon keys the shared hub can resolve', () => {
    const keys = toSettingsHubGroups(ALL_SECTIONS).flatMap((group) =>
      group.items.map((item) => item.icon)
    )

    expect(keys.length).toBeGreaterThan(0)
    for (const key of keys) expect(SETTINGS_HUB_ICON_KEYS).toContain(key)
  })

  it('groups no href twice', () => {
    const hrefs = groupedSettingsHrefs()
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })

  it('does not list the hub route as one of its own sections', () => {
    expect(groupedSettingsHrefs()).not.toContain('/settings')
  })
})

describe('toSettingsHubGroups', () => {
  it('renders every section when the viewer can see them all', () => {
    const items = toSettingsHubGroups(ALL_SECTIONS).flatMap(
      (group) => group.items
    )

    expect(items.map((item) => item.href).sort()).toEqual(
      declaredSettingsHrefs().sort()
    )
  })

  it('marks every rendered item available with its real href', () => {
    for (const group of toSettingsHubGroups(ALL_SECTIONS))
      for (const item of group.items) {
        expect(item.availability).toBe('available')
        expect(item.href).toMatch(/^\/settings\//)
      }
  })

  it('takes each item label from the navigation catalog, not a local copy', () => {
    const byHref = new Map(
      toSettingsHubGroups(ALL_SECTIONS)
        .flatMap((group) => group.items)
        .map((item) => [item.href, item.label])
    )

    for (const section of ALL_SECTIONS)
      expect(byHref.get(section.href)).toBe(section.title)
  })

  it('drops a group whose sections the viewer cannot see', () => {
    const groups = toSettingsHubGroups(sectionsFor(['/settings/roles']))

    expect(groups).toHaveLength(1)
    expect(groups[0].label).toBe('Access')
    expect(groups[0].items.map((item) => item.href)).toEqual([
      '/settings/roles',
    ])
  })

  it('returns no groups at all when the viewer can see nothing', () => {
    expect(toSettingsHubGroups([])).toEqual([])
  })

  it('preserves the declared group order', () => {
    expect(
      toSettingsHubGroups(ALL_SECTIONS).map((group) => group.label)
    ).toEqual(['Compliance', 'Money', 'Integrations', 'Access'])
  })

  it('preserves the declared item order inside a group', () => {
    const money = toSettingsHubGroups(ALL_SECTIONS).find(
      (group) => group.label === 'Money'
    )

    expect(money?.items.map((item) => item.href)).toEqual([
      '/settings/payment-modes',
      '/settings/billing',
      '/settings/templates',
      '/settings/branding',
      '/settings/subscriptions',
      '/settings/discounts',
    ])
  })

  it('does not mutate the sections it is given', () => {
    const input = [...ALL_SECTIONS]
    const snapshot = JSON.stringify(input)

    toSettingsHubGroups(input)

    expect(JSON.stringify(input)).toBe(snapshot)
  })

  it('ignores a section the group map does not declare', () => {
    const stray = {
      ...ALL_SECTIONS[0],
      href: '/settings/not-grouped',
    } as (typeof ALL_SECTIONS)[number]

    const hrefs = toSettingsHubGroups([...ALL_SECTIONS, stray]).flatMap(
      (group) => group.items.map((item) => item.href)
    )

    expect(hrefs).not.toContain('/settings/not-grouped')
  })
})

describe('permission filtering still belongs to the navigation catalog', () => {
  it('renders exactly the sections it is handed, and no others', () => {
    const permissions = ['roles:read'] as Permission[]
    const visible = BILLING_SETTINGS_SECTIONS.filter((section) =>
      section.permissions.some((permission) =>
        permissions.includes(permission as Permission)
      )
    )

    const hrefs = toSettingsHubGroups(visible).flatMap((group) =>
      group.items.map((item) => item.href)
    )

    expect(hrefs.sort()).toEqual(visible.map((section) => section.href).sort())
  })
})
