import type { RouteTabItem } from '@876/ui/route-tabs'

import { entitledWorkspaces, WORKSPACE_SEGMENT } from './app-workspaces'

/**
 * A tab on the organization detail page that belongs to a product app rather
 * than to the platform, and is shown only when the organization holds an
 * active entitlement for that app.
 */
export type AppOwnedTab = {
  /** The platform app slug that gates this tab, e.g. `'876-crm'`. */
  appSlug: string
  label: string
  /** Path segment appended to the organization base, e.g. `'requests'`. */
  segment: string
  /**
   * Label of the always-present tab this one sits after.
   *
   * Position is data rather than code so that adding an app really is one row
   * here — `orgTabs` names no app and never has to change.
   */
  after: AlwaysPresentTabLabel
}

/** A tab every organization has, regardless of what it is entitled to. */
export type AlwaysPresentTab = {
  label: string
  /** Path segment appended to the organization base; empty for the index. */
  segment: string
  exact?: boolean
}

export const ALWAYS_PRESENT_TABS = [
  { label: 'Overview', segment: '', exact: true },
  { label: 'Members', segment: 'members' },
  { label: 'Customers', segment: 'customers' },
  // Always present, and deliberately not entitlement-gated: every organization
  // is a customer of 876 from the moment it exists, so it can always have
  // raised something with us — including one entitled to no product at all.
  { label: 'Support', segment: 'support' },
  { label: 'Subscriptions', segment: 'subscriptions' },
  { label: 'Onboarding', segment: 'onboarding' },
  { label: 'Activity', segment: 'activity' },
  { label: 'Notes', segment: 'notes' },
] as const satisfies readonly AlwaysPresentTab[]

export type AlwaysPresentTabLabel =
  (typeof ALWAYS_PRESENT_TABS)[number]['label']

export const APP_OWNED_TABS: AppOwnedTab[] = [
  {
    appSlug: '876-billing',
    label: 'Billing',
    segment: 'billing',
    after: 'Onboarding',
  },
  // Add a future app here — one row, no change to orgTabs.
]

/**
 * The single tab behind which every app workspace lives.
 *
 * One tab, not one per app. An app-owned tab per product looked reasonable at
 * two apps and stops working at five, and it also blurred a distinction that
 * matters: the other tabs answer what the organization has *with 876*, while a
 * workspace answers what it is doing *inside a product*. Keeping the second
 * question behind one door leaves the strip stable as apps are added.
 *
 * It is still entitlement-gated — an organization working in no app Console can
 * open has nothing behind the door, so the door is not drawn.
 */
const WORKSPACE_TAB_AFTER: AlwaysPresentTabLabel = 'Onboarding'

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
  const hasWorkspace = entitledWorkspaces(entitledAppSlugs).length > 0

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
    ...(hasWorkspace && tab.label === WORKSPACE_TAB_AFTER
      ? [{ label: 'Workspace', href: `${base}/${WORKSPACE_SEGMENT}` }]
      : []),
  ])
}
