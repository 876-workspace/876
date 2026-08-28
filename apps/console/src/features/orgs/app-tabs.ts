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
  { label: 'Subscriptions', segment: 'subscriptions' },
  { label: 'Onboarding', segment: 'onboarding' },
  { label: 'Activity', segment: 'activity' },
  { label: 'Notes', segment: 'notes' },
] as const satisfies readonly AlwaysPresentTab[]

export type AlwaysPresentTabLabel =
  (typeof ALWAYS_PRESENT_TABS)[number]['label']

export const APP_OWNED_TABS: AppOwnedTab[] = [
  {
    appSlug: '876-crm',
    label: 'Requests',
    segment: 'requests',
    after: 'Customers',
  },
  {
    appSlug: '876-billing',
    label: 'Billing',
    segment: 'billing',
    after: 'Onboarding',
  },
  // Add a future app here — one row, no change to orgTabs.
]
