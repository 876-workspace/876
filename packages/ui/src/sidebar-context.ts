import type { NavEntry, NavGroupDefinition } from '@876/core/access'

export type SidebarContextKind =
  | 'root'
  | 'section'
  | 'product'
  | 'workspace'

export type SidebarContext = {
  key: string
  kind: SidebarContextKind
  backLabel: string
  title: string
  subtitle?: string
  href: string
  icon?: string
  logoUrl?: string | null
  colorClassName?: string
  activeClassName?: string
  parentKey: string | null
  groups: readonly NavGroupDefinition[]
}

export type SidebarContextDefinition = Omit<SidebarContext, 'kind'> & {
  kind: Exclude<SidebarContextKind, 'root'>
}

export type SidebarContextOptions = {
  rootKey?: string
  rootBackLabel?: string
  /**
   * Only these navigation entries promote their `children` into a full sidebar
   * context. Nested entries that are not named here remain ordinary dropdowns.
   */
  sectionKeys?: readonly string[]
}

const DEFAULT_ROOT_KEY = 'root'

export function isActiveSidebarPath(pathname: string, href: string): boolean {
  if (href === '#') return false
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function contextEntries(context: SidebarContext): readonly NavEntry[] {
  return context.groups.flatMap((group) => group.entries)
}

function rootContext(
  navigation: readonly NavGroupDefinition[],
  options: SidebarContextOptions
): SidebarContext {
  return {
    key: options.rootKey ?? DEFAULT_ROOT_KEY,
    kind: 'root',
    backLabel: options.rootBackLabel ?? 'Home',
    title: '',
    href: '/',
    parentKey: null,
    groups: navigation,
  }
}

function sectionContexts(
  navigation: readonly NavGroupDefinition[],
  options: SidebarContextOptions
): SidebarContext[] {
  const sectionKeys = new Set(options.sectionKeys ?? [])
  const parentKey = options.rootKey ?? DEFAULT_ROOT_KEY

  return navigation.flatMap((group) =>
    group.entries.flatMap((entry) =>
      sectionKeys.has(entry.key) && entry.children && entry.children.length > 0
        ? [
            {
              key: entry.key,
              kind: 'section' as const,
              backLabel: entry.title,
              title: entry.title,
              href: entry.href,
              icon: entry.icon,
              ...(entry.colorClassName
                ? { colorClassName: entry.colorClassName }
                : {}),
              ...(entry.activeClassName
                ? { activeClassName: entry.activeClassName }
                : {}),
              parentKey,
              groups: [
                { key: `${entry.key}-items`, entries: entry.children },
              ] as readonly NavGroupDefinition[],
            },
          ]
        : []
    )
  )
}

export function sidebarContexts(
  navigation: readonly NavGroupDefinition[],
  declared: readonly SidebarContextDefinition[] = [],
  options: SidebarContextOptions = {}
): SidebarContext[] {
  return [
    rootContext(navigation, options),
    ...sectionContexts(navigation, options),
    ...declared,
  ]
}

function contextClaims(context: SidebarContext, pathname: string): boolean {
  if (context.kind === 'root') return false
  if (isActiveSidebarPath(pathname, context.href)) return true

  return contextEntries(context).some((entry) =>
    isActiveSidebarPath(pathname, entry.href)
  )
}

export function resolveSidebarContextStack(
  pathname: string,
  navigation: readonly NavGroupDefinition[],
  declared: readonly SidebarContextDefinition[] = [],
  options: SidebarContextOptions = {}
): SidebarContext[] {
  const contexts = sidebarContexts(navigation, declared, options)
  const claiming = contexts
    .filter((context) => contextClaims(context, pathname))
    .sort((left, right) => left.href.length - right.href.length)

  const root = contexts[0]
  if (!root) return []

  const stack: SidebarContext[] = [root]

  for (const context of claiming) {
    if (stack.some((open) => open.key === context.key)) continue
    if (!stack.some((open) => open.key === context.parentKey)) continue
    stack.push(context)
  }

  return stack
}

export function resolveSidebarBackContext(
  stack: readonly SidebarContext[],
  key: string
): SidebarContext | null {
  const index = stack.findIndex((context) => context.key === key)
  return index > 0 ? (stack[index - 1] ?? null) : null
}

export function entryOpensContext(
  entry: NavEntry,
  contexts: readonly SidebarContext[]
): boolean {
  return contexts.some(
    (context) => context.kind !== 'root' && context.href === entry.href
  )
}

export function resolveActiveEntryKey(
  pathname: string,
  context: SidebarContext
): string | null {
  let matched: NavEntry | null = null

  for (const entry of contextEntries(context)) {
    if (!isActiveSidebarPath(pathname, entry.href)) continue
    if (matched === null || entry.href.length > matched.href.length)
      matched = entry
  }

  return matched?.key ?? null
}
