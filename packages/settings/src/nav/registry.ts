import type { SettingsNav, SettingsNavGroup, SettingsNavItem } from '../types'

export function defineSettingsNav(groups: SettingsNavGroup[]): SettingsNav {
  const groupKeys = new Set<string>()

  for (const group of groups) {
    if (groupKeys.has(group.key))
      throw new Error(`Duplicate settings nav group key: ${group.key}`)

    groupKeys.add(group.key)
    const itemTitles = new Set<string>()

    for (const item of group.items) {
      if (itemTitles.has(item.title))
        throw new Error(
          `Duplicate settings nav item title in ${group.key}: ${item.title}`
        )
      if (item.status === 'available' && !item.href)
        throw new Error(
          `Available settings nav item requires href: ${item.title}`
        )
      if (item.status === 'planned' && item.href)
        throw new Error(
          `Planned settings nav item cannot have href: ${item.title}`
        )

      itemTitles.add(item.title)
      Object.freeze(item)
    }

    Object.freeze(group.items)
    Object.freeze(group)
  }

  return Object.freeze(groups)
}

export function filterSettingsNav(
  nav: SettingsNav,
  permissions: readonly string[]
): SettingsNav {
  const heldPermissions = new Set(permissions)

  return nav.flatMap((group) => {
    const items = group.items.filter(
      (item) =>
        item.permission === undefined || heldPermissions.has(item.permission)
    )

    return items.length === 0 ? [] : [{ ...group, items }]
  })
}

/**
 * Groups a nav into its declared sections, preserving declaration order for both
 * sections and the groups inside them. Groups without a section are returned
 * first under an empty section label.
 */
export function settingsNavSections(
  nav: SettingsNav
): { section: string; groups: SettingsNavGroup[] }[] {
  const sections: { section: string; groups: SettingsNavGroup[] }[] = []

  for (const group of nav) {
    const label = group.section ?? ''
    const existing = sections.find((entry) => entry.section === label)

    if (existing) existing.groups.push(group)
    else sections.push({ section: label, groups: [group] })
  }

  return sections
}

export function resolveSettingsHref(
  orgSlug: string,
  item: SettingsNavItem
): string | undefined {
  return item.href === undefined ? undefined : `/org/${orgSlug}${item.href}`
}
