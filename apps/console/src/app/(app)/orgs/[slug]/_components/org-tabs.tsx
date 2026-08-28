import type { RouteTabItem } from '@876/ui/route-tabs'

import { ALWAYS_PRESENT_TABS, APP_OWNED_TABS } from '@/features/orgs/app-tabs'

/**
 * The organization detail tab set.
 *
 * The always-present tabs are the same for every organization; an app-owned tab
 * appears only when the organization holds an active or trialing entitlement
 * for the app that owns it. Pass an empty array to get the baseline strip,
 * which is what the layout renders as its Suspense fallback so the tabs are
 * real and clickable before entitlements have resolved.
 *
 * This function names no app. Both the gating slug and the insertion point come
 * from the registry, so adding an app is a row in `app-tabs.ts` and nothing
 * here.
 */
export function orgTabs(
  base: string,
  entitledAppSlugs: readonly string[]
): RouteTabItem[] {
  const entitled = new Set(entitledAppSlugs)
  const active = APP_OWNED_TABS.filter((tab) => entitled.has(tab.appSlug))

  return ALWAYS_PRESENT_TABS.flatMap((tab) => [
    {
      label: tab.label,
      href: tab.segment ? `${base}/${tab.segment}` : base,
      ...('exact' in tab && tab.exact ? { exact: true } : {}),
    },
    ...active
      .filter((appTab) => appTab.after === tab.label)
      .map((appTab) => ({
        label: appTab.label,
        href: `${base}/${appTab.segment}`,
      })),
  ])
}
