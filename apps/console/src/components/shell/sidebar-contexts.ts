import type { NavEntry, NavGroupDefinition } from '@876/core/access'

import { isActiveConsolePath } from '@/components/shell/nav-link'

export type SidebarContextKind = 'platform' | 'section' | 'product' | 'workspace'

export type SidebarContext = {
  key: string
  kind: SidebarContextKind
  title: string
  href: string
  parentKey: string | null
  entries: readonly NavEntry[]
}

/** A context declared independently of the platform navigation tree. */
export type SidebarContextDefinition = SidebarContext

function navigationSections(
  navigation: readonly NavGroupDefinition[]
): SidebarContext[] {
  return navigation.flatMap((group) =>
    group.entries.flatMap((entry) =>
      entry.children && entry.children.length > 0
        ? [
            {
              key: entry.key,
              kind: 'section' as const,
              title: entry.title,
              href: entry.href,
              parentKey: 'platform',
              entries: entry.children,
            },
          ]
        : []
    )
  )
}

/**
 * Builds the pathname-derived sidebar stack from the resolved registry.
 *
 * The platform context is always the root. Sections declared by navigation or
 * supplied explicitly can sit above it, while product and workspace contexts
 * use the same representation once those routes are introduced.
 */
export function resolveSidebarContextStack(
  pathname: string,
  navigation: readonly NavGroupDefinition[],
  declared: readonly SidebarContextDefinition[] = []
): SidebarContext[] {
  const platform: SidebarContext = {
    key: 'platform',
    kind: 'platform',
    title: 'Console',
    href: '/',
    parentKey: null,
    entries: navigation.flatMap((group) => group.entries),
  }

  const contexts = [...navigationSections(navigation), ...declared]
  const matches = contexts.filter(
    (context) =>
      isActiveConsolePath(pathname, context.href) ||
      context.entries.some((entry) =>
        isActiveConsolePath(pathname, entry.href)
      )
  )

  matches.sort((a, b) => a.href.length - b.href.length)

  const stack = [platform]
  for (const context of matches) {
    const parent = context.parentKey
    if (parent === null || stack.some((item) => item.key === parent))
      stack.push(context)
  }

  return stack
}

export function resolveSidebarContext(
  pathname: string,
  navigation: readonly NavGroupDefinition[],
  declared: readonly SidebarContextDefinition[] = []
): SidebarContext | null {
  const stack = resolveSidebarContextStack(pathname, navigation, declared)
  return stack.length > 1 ? (stack.at(-1) ?? null) : null
}

/** Kept as the narrow compatibility helper for existing Console callers/tests. */
export function resolveOpenSectionKey(
  pathname: string,
  navigation: readonly NavGroupDefinition[]
): string | null {
  const context = resolveSidebarContext(pathname, navigation)
  return context?.kind === 'section' ? context.key : null
}

export type NavSection = SidebarContext & {
  kind: 'section'
}

export function isNavSection(entry: NavEntry): entry is NavEntry & {
  children: readonly NavEntry[]
} {
  return Array.isArray(entry.children) && entry.children.length > 0
}

export function navSections(
  navigation: readonly NavGroupDefinition[]
): NavSection[] {
  return navigationSections(navigation) as NavSection[]
}

export function resolveActiveChildKey(
  pathname: string,
  context: Pick<SidebarContext, 'entries'>
): string | null {
  let matched: NavEntry | null = null

  for (const child of context.entries) {
    if (!isActiveConsolePath(pathname, child.href)) continue
    if (matched === null || child.href.length > matched.href.length)
      matched = child
  }

  return matched?.key ?? null
}
