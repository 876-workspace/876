import type { NavEntry, NavGroupDefinition } from '@876/core/access'
import type { AdminApp } from '@876/platform/compat'

import type { SidebarContextDefinition } from '@/components/shell/sidebar-context'
import { PLATFORM_CONTEXT_KEY } from '@/components/shell/sidebar-context'

/**
 * One section of an app's record, rendered by the sidebar's product context.
 */
export type AppDetailSection = {
  key: string
  label: string
  /** Path relative to the app record; empty for the record's own overview. */
  segment: string
  /** Icon key, resolved by the shell. Never a component. */
  icon: string
}

const SECTIONS = {
  overview: {
    key: 'overview',
    label: 'Overview',
    segment: '',
    icon: 'overview',
  },
  modules: {
    key: 'modules',
    label: 'Modules',
    segment: '/modules',
    icon: 'modules',
  },
  operations: {
    key: 'operations',
    label: 'Operations',
    segment: '/operations',
    icon: 'operations',
  },
  plans: { key: 'plans', label: 'Plans', segment: '/plans', icon: 'plans' },
  subscribers: {
    key: 'subscribers',
    label: 'Subscribers',
    segment: '/subscribers',
    icon: 'subscribers',
  },
  widgets: {
    key: 'widgets',
    label: 'Widgets',
    segment: '/widgets',
    icon: 'widgets',
  },
  features: {
    key: 'features',
    label: 'Feature Flags',
    segment: '/features',
    icon: 'features',
  },
  audit: { key: 'audit', label: 'Audit', segment: '/audit', icon: 'audit' },
  provisioning: {
    key: 'provisioning',
    label: 'Provisioning',
    segment: '/provisioning',
    icon: 'provisioning',
  },
  settings: {
    key: 'settings',
    label: 'Settings',
    segment: '/settings',
    icon: 'settings',
  },
} satisfies Record<string, AppDetailSection>

/**
 * The sections an app of this kind has.
 *
 * A product app is the only kind that sells anything, so plans, subscribers,
 * provisioning, and its audit trail exist only there. A platform app is
 * configured but not sold; an internal app has no modules of its own.
 */
export function appDetailSections(
  appKind: AdminApp['app_kind']
): AppDetailSection[] {
  if (appKind === 'product')
    return [
      SECTIONS.overview,
      SECTIONS.operations,
      SECTIONS.modules,
      SECTIONS.plans,
      SECTIONS.subscribers,
      SECTIONS.widgets,
      SECTIONS.features,
      SECTIONS.audit,
      SECTIONS.provisioning,
      SECTIONS.settings,
    ]

  if (appKind === 'platform')
    return [
      SECTIONS.overview,
      SECTIONS.modules,
      SECTIONS.widgets,
      SECTIONS.features,
      SECTIONS.settings,
    ]

  return [
    SECTIONS.overview,
    SECTIONS.widgets,
    SECTIONS.features,
    SECTIONS.settings,
  ]
}

/**
 * The sidebar context for one app record.
 *
 * Console swaps its whole rail here: inside an app you are administering that
 * product, so the platform rail's users, organizations, and reports are noise.
 * Back returns to the platform, and the Apps entry that opened it.
 */
export function appSidebarContext(
  appKind: AdminApp['app_kind'],
  slug: string,
  appName: string,
  logoUrl: string | null
): SidebarContextDefinition {
  const base = `/apps/${slug}`
  const entries: NavEntry[] = appDetailSections(appKind).map((section) => ({
    key: `app-${section.key}`,
    title: section.label,
    href: `${base}${section.segment}`,
    icon: section.icon,
  }))

  return {
    key: `app-${slug}`,
    kind: 'product',
    backLabel: appName,
    title: appName,
    href: base,
    icon: 'apps',
    logoUrl,
    colorClassName: 'text-purple-500 dark:text-purple-400',
    activeClassName: 'bg-purple-500/12 ring-purple-500/30',
    parentKey: PLATFORM_CONTEXT_KEY,
    groups: [{ key: 'app-sections', entries } as NavGroupDefinition],
  }
}
