import {
  defineNavigation,
  resolveNavigation,
  type AccessContext,
  type NavRequirement,
} from '@876/core/access'

export type SettingsOption = {
  key: string
  title: string
  description: string
  href: string
  icon: string
  iconColor: string
  requires?: NavRequirement
}

/** Metadata for the /settings hub. Authorization lives in SETTINGS_NAVIGATION. */
export const SETTINGS_OPTIONS: readonly SettingsOption[] = [
  {
    key: 'general',
    title: 'General',
    description: 'Platform name, timezone, and global defaults.',
    href: '/settings/general',
    icon: 'settings',
    iconColor: 'text-muted-foreground',
  },
  {
    key: 'team',
    title: 'Team',
    description: 'Manage who has access to Console.',
    href: '/settings/users',
    icon: 'users',
    iconColor: 'text-blue-600 dark:text-blue-400',
    requires: { permission: 'team:list' },
  },
  {
    key: 'roles',
    title: 'Roles',
    description: 'Manage Console roles and their permission grants.',
    href: '/settings/users/roles',
    icon: 'roles',
    iconColor: 'text-violet-600 dark:text-violet-400',
    requires: { permission: 'roles:list' },
  },
  {
    key: 'security',
    title: 'Security',
    description:
      'Auth policies, session limits, reserved usernames, and OAuth configuration.',
    href: '/settings/security',
    icon: 'security',
    iconColor: 'text-amber-600 dark:text-amber-400',
    requires: { permission: 'console:security' },
  },
  {
    key: 'orgs',
    title: 'Organization provisioning',
    description:
      'Shared defaults and reconciliation runs for organization setup.',
    href: '/settings/orgs/provisioning',
    icon: 'organizations',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    key: 'notifications',
    title: 'Notifications',
    description: 'Alert channels and event subscriptions.',
    href: '/settings/notifications',
    icon: 'notifications',
    iconColor: 'text-violet-600 dark:text-violet-400',
  },
]

export const SETTINGS_NAVIGATION = defineNavigation([
  {
    key: 'settings',
    entries: SETTINGS_OPTIONS.map((option) => ({
      key: option.key,
      title: option.title,
      href: option.href,
      icon: option.icon,
      requires: option.requires,
    })),
  },
])

export function resolveSettingsOptions(
  context: AccessContext
): SettingsOption[] {
  const visibleKeys = new Set(
    resolveNavigation(SETTINGS_NAVIGATION, context).flatMap((group) =>
      group.entries.map((entry) => entry.key)
    )
  )

  return SETTINGS_OPTIONS.filter((option) => visibleKeys.has(option.key)).map(
    (option) => ({ ...option })
  )
}
