import type { NavGroupDefinition } from '@876/core/access'
import {
  resolveActiveEntryKey,
  type SidebarContext,
} from '@876/ui/sidebar-context'

export const SETTINGS_SEGMENT = 'settings'

/**
 * The condensed settings navigation — one page per item. Icon values are
 * string keys resolved by `nav-icons`, never components, so this registry
 * stays RSC-serializable.
 */
export const SETTINGS_NAV_GROUPS: readonly NavGroupDefinition[] = [
  {
    key: 'organization',
    label: 'Organization',
    entries: [
      {
        key: 'orgprofile',
        title: 'Organization profile',
        href: '/settings/orgprofile',
        icon: 'org-profile',
      },
      {
        key: 'branding',
        title: 'Branding',
        href: '/settings/branding',
        icon: 'branding',
      },
      {
        key: 'locations',
        title: 'Branches & locations',
        href: '/settings/locations',
        icon: 'locations',
      },
      {
        key: 'users',
        title: 'Users',
        href: '/settings/users',
        icon: 'users',
      },
      {
        key: 'roles',
        title: 'Roles',
        href: '/settings/users/roles',
        icon: 'roles',
      },
      {
        key: 'subscription',
        title: 'Subscription',
        href: '/settings/subscription',
        icon: 'subscription',
      },
    ],
  },
  {
    key: 'product',
    label: 'Product',
    entries: [
      {
        key: 'modules',
        title: 'Modules',
        href: '/settings/modules',
        icon: 'modules',
      },
      {
        key: 'portal',
        title: 'Customer portal',
        href: '/settings/portal',
        icon: 'portal',
      },
      {
        key: 'finance',
        title: 'Finance',
        href: '/settings/finance',
        icon: 'finance',
      },
      {
        key: 'customization',
        title: 'Customization',
        href: '/settings/customization',
        icon: 'customization',
      },
      {
        key: 'notifications',
        title: 'Notifications',
        href: '/settings/notifications',
        icon: 'notifications',
      },
    ],
  },
  {
    key: 'developer',
    label: 'Developer',
    entries: [
      {
        key: 'integrations',
        title: 'Integrations',
        href: '/settings/integrations',
        icon: 'integrations',
      },
      {
        key: 'automation',
        title: 'Automation',
        href: '/settings/automation',
        icon: 'automation',
      },
    ],
  },
]

/** Whether the operator is inside settings, where the rail swaps contexts. */
export function isSettingsPath(pathname: string, basePath: string): boolean {
  const root = `${basePath}/${SETTINGS_SEGMENT}`
  return pathname === root || pathname.startsWith(`${root}/`)
}

/**
 * The settings sidebar context for one organization. Hrefs are absolute
 * (prefixed with the org base path); matching still uses the shared
 * `isActiveSidebarPath` prefix semantics so nested pages highlight.
 */
export function settingsContext(basePath: string): SidebarContext {
  return {
    key: 'settings',
    kind: 'product',
    backLabel: 'Workspace',
    title: 'Settings',
    href: `${basePath}/${SETTINGS_SEGMENT}`,
    icon: 'settings',
    parentKey: 'app',
    groups: SETTINGS_NAV_GROUPS.map((group) => ({
      ...group,
      entries: group.entries.map((entry) => ({
        ...entry,
        href: `${basePath}${entry.href}`,
      })),
    })),
  }
}

/**
 * The settings entry owning a pathname — longest href wins, so
 * `users/roles/new` resolves to Roles, not Users. Shares the matching rule with
 * the rendered links (`isActiveSidebarPath`) so the highlight cannot drift.
 */
export function resolveSettingsActiveKey(
  pathname: string,
  basePath: string
): string | null {
  return resolveActiveEntryKey(pathname, settingsContext(basePath))
}
