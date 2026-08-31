import * as React from 'react'
import Image from 'next/image'
import type { RouteTabItem } from '@876/ui/route-tabs'
import type { AdminSubscription } from '@876/platform/compat'
import { cn } from '@876/core/utils'
import { appColor } from '@/lib/app-color'

import { APP_WORKSPACES, findAppWorkspace } from './app-workspaces'

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
  { label: 'Profile', segment: '', exact: true },
  { label: 'Members', segment: 'members' },
  { label: 'Customers', segment: 'customers' },
  // Deliberately not entitlement-gated: every organization is a customer of
  // 876 from the moment it exists, so it can always have raised requests with
  // us — including one entitled to no product at all.
  { label: 'Requests', segment: 'support' },
  { label: 'Activity', segment: 'activity' },
] as const satisfies readonly AlwaysPresentTab[]

export type AlwaysPresentTabLabel =
  (typeof ALWAYS_PRESENT_TABS)[number]['label']

export const APP_OWNED_TABS: AppOwnedTab[] = [
  // Add a future app here — one row, no change to orgTabs.
]

export const APP_TABS_AFTER: AlwaysPresentTabLabel = 'Customers'

export type EntitledApp = {
  slug: string
  name?: string | null
  logoUrl?: string | null
  id?: string | null
}

export type EntitledAppInput = string | EntitledApp | AdminSubscription

export function normalizeEntitledApp(
  item: EntitledAppInput
): EntitledApp | null {
  if (!item) return null
  if (typeof item === 'string') {
    const slug = item.trim()
    if (!slug) return null
    return {
      slug,
      name: formatDefaultAppName(slug),
      logoUrl: null,
    }
  }
  if ('app_slug' in item || 'app_id' in item) {
    const sub = item as AdminSubscription
    const slug = sub.app_slug ?? sub.app_id ?? ''
    if (!slug) return null
    return {
      slug,
      name: sub.app_name ?? formatDefaultAppName(slug),
      logoUrl: sub.app_logo_url ?? null,
      id: sub.app_id ?? null,
    }
  }
  const app = item as EntitledApp
  if (!app.slug) return null
  return {
    slug: app.slug,
    name: app.name ?? formatDefaultAppName(app.slug),
    logoUrl: app.logoUrl ?? null,
    id: app.id ?? null,
  }
}

function formatDefaultAppName(slug: string): string {
  if (slug === '876-crm') return '876 CRM'
  if (slug === '876-billing') return '876 Billing'
  if (slug === '876-invoice') return '876 Invoice'
  if (slug === '876-couriers') return '876 Couriers'
  return slug
    .replace(/^876-/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function entitledAppHref(base: string, appSlug: string): string {
  const workspaceKey = appSlug.replace(/^876-/, '')
  const workspace =
    findAppWorkspace(workspaceKey) ??
    APP_WORKSPACES.find((w) => w.appSlug === appSlug)
  if (workspace) {
    return `${base}/workspace/${workspace.key}`
  }
  return `${base}/workspace/${workspaceKey}`
}

export function AppTabLabel({
  name,
  slug,
  logoUrl,
}: {
  name: string
  slug: string
  logoUrl?: string | null
}) {
  return (
    <span className="flex items-center gap-1.5">
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt=""
          width={16}
          height={16}
          unoptimized
          className="size-4 shrink-0 rounded-sm object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            'inline-flex size-4 shrink-0 items-center justify-center rounded-sm text-[0.5625rem] font-semibold text-white uppercase',
            appColor(slug)
          )}
        >
          {name.charAt(0)}
        </span>
      )}
      <span>{name}</span>
    </span>
  )
}

/**
 * The organization detail tab set.
 *
 * The always-present tabs are the same for every organization; entitled apps
 * dynamically render a tab with their app logo alongside the app name in
 * between Customers and Requests.
 */
export function orgTabs(
  base: string,
  entitledAppsInput: readonly EntitledAppInput[] = []
): RouteTabItem[] {
  const normalized: EntitledApp[] = []
  const seen = new Set<string>()
  for (const item of entitledAppsInput) {
    const app = normalizeEntitledApp(item)
    if (app && !seen.has(app.slug)) {
      seen.add(app.slug)
      normalized.push(app)
    }
  }

  const entitledAppSlugs = normalized.map((app) => app.slug)
  const active = APP_OWNED_TABS.filter((tab) =>
    entitledAppSlugs.includes(tab.appSlug)
  )

  const dynamicAppTabs: RouteTabItem[] = normalized.map((app) => ({
    label: (
      <AppTabLabel
        name={app.name ?? app.slug}
        slug={app.slug}
        logoUrl={app.logoUrl}
      />
    ),
    href: entitledAppHref(base, app.slug),
  }))

  return ALWAYS_PRESENT_TABS.flatMap((tab) => {
    const items: RouteTabItem[] = [
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
    ]

    if (tab.label === APP_TABS_AFTER) {
      items.push(...dynamicAppTabs)
    }

    return items
  })
}
