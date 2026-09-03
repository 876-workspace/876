import type { NavEntry, NavGroupDefinition } from '@876/core/access'

import { isActiveConsolePath } from '@/components/shell/nav-link'

/** A resolved nav entry that owns a drill-down panel. */
export type NavSection = NavEntry & { children: readonly NavEntry[] }

/** True when this entry drills down instead of navigating straight through. */
export function isNavSection(entry: NavEntry): entry is NavSection {
  return Array.isArray(entry.children) && entry.children.length > 0
}

/** Every drill-down section in the resolved registry, in sidebar order. */
export function navSections(
  navigation: readonly NavGroupDefinition[]
): NavSection[] {
  return navigation.flatMap((group) => group.entries.filter(isNavSection))
}

/**
 * The section the current path belongs to, or `null` for the rail.
 *
 * A section claims a path when the path matches the section root **or any of
 * its children**. Every child today lives under its section's own prefix, so
 * the root check alone would suffice; the child check keeps the resolver
 * correct over the registry's data shape rather than over that coincidence, so
 * a child adopted from outside the prefix still opens its panel.
 *
 * Deriving the open panel from the path rather than from click state is the
 * whole design: a deep link, a refresh, and the browser's back button all land
 * on the correct panel without any state to keep in sync.
 */
export function resolveOpenSectionKey(
  pathname: string,
  navigation: readonly NavGroupDefinition[]
): string | null {
  for (const section of navSections(navigation)) {
    if (isActiveConsolePath(pathname, section.href)) return section.key
    if (
      section.children.some((child) =>
        isActiveConsolePath(pathname, child.href)
      )
    )
      return section.key
  }

  return null
}

/**
 * The key of the panel item that owns the current path, or `null`.
 *
 * Longest match wins. A section's index item and its siblings share a prefix —
 * Projects' Overview is `/projects`, its Issues list is `/projects/issues` — so
 * prefix matching alone would light up Overview everywhere in the section.
 * Exact matching would instead leave a record page such as `/requests/req_1`
 * with nothing highlighted. Taking the longest matching href gets both right.
 */
export function resolveActiveChildKey(
  pathname: string,
  section: NavSection
): string | null {
  let matched: NavEntry | null = null

  for (const child of section.children) {
    if (!isActiveConsolePath(pathname, child.href)) continue
    if (matched === null || child.href.length > matched.href.length)
      matched = child
  }

  return matched?.key ?? null
}
