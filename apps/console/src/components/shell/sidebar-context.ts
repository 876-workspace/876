import type { NavEntry, NavGroupDefinition } from '@876/core/access'

import { isActiveConsolePath } from '@/components/shell/nav-link'

/**
 * What kind of thing a context represents. The kind is presentation and
 * telemetry only — the stack resolver treats every kind identically, so adding
 * a fifth kind never means touching the resolver.
 */
export type SidebarContextKind =
  'platform' | 'section' | 'product' | 'workspace'

/** The key of the root context. Every other context descends from it. */
export const PLATFORM_CONTEXT_KEY = 'platform'

/**
 * One level of the sidebar's navigation stack.
 *
 * A context owns the whole rail while it is open: the platform rail is one
 * context, a drill-down section is another, and a product or an organization's
 * workspace will be others. Its `groups` keep the registry's own grouping so a
 * context can render dividers exactly as the platform rail does.
 */
export type SidebarContext = {
  key: string
  kind: SidebarContextKind
  title: string
  /**
   * A second line under the title, for a context that names two things.
   *
   * A workspace does: it is one product's navigation *for one organization*,
   * and the rail is the only chrome that says which organization. An app
   * record names one thing and leaves this unset.
   */
  subtitle?: string
  /** The path that opens this context, and the target of its own rail entry. */
  href: string
  /** Icon key for the back control. A string, like every registry icon. */
  icon?: string
  colorClassName?: string
  activeClassName?: string
  /** The context to return to. `null` only for the platform root. */
  parentKey: string | null
  groups: readonly NavGroupDefinition[]
}

/**
 * A context declared independently of the platform navigation tree.
 *
 * Declaring a context separately from `NavEntry.children` is what allows an
 * **empty** one: `resolveNavigation` drops an entry whose declared children all
 * resolve away, which is right for a group inside a context and wrong for a
 * context itself. Storage is the standing proof — it swaps the rail before that
 * product has any navigation to put in it.
 */
export type SidebarContextDefinition = Omit<SidebarContext, 'kind'> & {
  kind: Exclude<SidebarContextKind, 'platform'>
}

/** Every entry in a context, flattened across its groups. */
export function contextEntries(context: SidebarContext): readonly NavEntry[] {
  return context.groups.flatMap((group) => group.entries)
}

/** The root context, built from the resolved platform registry. */
function platformContext(
  navigation: readonly NavGroupDefinition[]
): SidebarContext {
  return {
    key: PLATFORM_CONTEXT_KEY,
    kind: 'platform',
    title: 'Console',
    href: '/',
    parentKey: null,
    groups: navigation,
  }
}

/**
 * Contexts implied by a platform entry that declares children.
 *
 * A section inherits its parent entry's tint so the open rail reads as one
 * section rather than a rainbow of unrelated rows.
 */
function sectionContexts(
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
              icon: entry.icon,
              ...(entry.colorClassName
                ? { colorClassName: entry.colorClassName }
                : {}),
              ...(entry.activeClassName
                ? { activeClassName: entry.activeClassName }
                : {}),
              parentKey: PLATFORM_CONTEXT_KEY,
              groups: [
                { key: `${entry.key}-items`, entries: entry.children },
              ] as readonly NavGroupDefinition[],
            },
          ]
        : []
    )
  )
}

/** Every context that exists for this subject, root first. */
export function sidebarContexts(
  navigation: readonly NavGroupDefinition[],
  declared: readonly SidebarContextDefinition[] = []
): SidebarContext[] {
  return [
    platformContext(navigation),
    ...sectionContexts(navigation),
    ...declared,
  ]
}

/** True when this context claims the current path. */
function contextClaims(context: SidebarContext, pathname: string): boolean {
  if (context.kind === 'platform') return false
  if (isActiveConsolePath(pathname, context.href)) return true

  return contextEntries(context).some((entry) =>
    isActiveConsolePath(pathname, entry.href)
  )
}

/**
 * The context stack for a path, root first and deepest last.
 *
 * The stack is **derived from the pathname**, never from click state, so a deep
 * link, a refresh, and the browser's back button all land on the right level
 * with nothing to keep in sync. Claiming contexts are ordered by href length,
 * which is depth for the prefix-nested paths this registry uses, and a context
 * whose declared parent is not on the stack is dropped rather than grafted onto
 * the root — a mis-declared parent should lose its level, not silently acquire
 * a different one.
 */
export function resolveSidebarContextStack(
  pathname: string,
  navigation: readonly NavGroupDefinition[],
  declared: readonly SidebarContextDefinition[] = []
): SidebarContext[] {
  const contexts = sidebarContexts(navigation, declared)
  const claiming = contexts
    .filter((context) => contextClaims(context, pathname))
    .sort((left, right) => left.href.length - right.href.length)

  const stack: SidebarContext[] = [contexts[0] as SidebarContext]

  for (const context of claiming) {
    if (stack.some((open) => open.key === context.key)) continue
    if (!stack.some((open) => open.key === context.parentKey)) continue
    stack.push(context)
  }

  return stack
}

/** The context one level above `key`, or `null` at the root. */
export function resolveSidebarBackContext(
  stack: readonly SidebarContext[],
  key: string
): SidebarContext | null {
  const index = stack.findIndex((context) => context.key === key)
  return index > 0 ? (stack[index - 1] ?? null) : null
}

/**
 * True when following this entry opens a context rather than merely navigating.
 *
 * Asked of the entry's href rather than of `entry.children`, because a context
 * may be declared separately from the tree — Storage has no children and still
 * opens a context. Reading the children would leave such an entry unable to
 * reopen the context an operator had backed out of.
 */
export function entryOpensContext(
  entry: NavEntry,
  contexts: readonly SidebarContext[]
): boolean {
  return contexts.some(
    (context) => context.kind !== 'platform' && context.href === entry.href
  )
}

/**
 * The key of the entry that owns the current path within one context.
 *
 * Longest match wins. A context's index entry and its siblings share a prefix —
 * Projects' Overview is `/projects`, its Issues list is `/projects/issues` — so
 * prefix matching alone would light up Overview everywhere in the context.
 * Exact matching would instead leave a record page such as `/requests/req_1`
 * with nothing highlighted. Taking the longest matching href gets both right.
 */
export function resolveActiveEntryKey(
  pathname: string,
  context: SidebarContext
): string | null {
  let matched: NavEntry | null = null

  for (const entry of contextEntries(context)) {
    if (!isActiveConsolePath(pathname, entry.href)) continue
    if (matched === null || entry.href.length > matched.href.length)
      matched = entry
  }

  return matched?.key ?? null
}
