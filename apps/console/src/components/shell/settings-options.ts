import type { IconComponent } from '@876/ui/icons'
import { Building2, KeyRound, Settings, Users, Waves } from '@876/ui/icons'

/**
 * A top-level settings option displayed on the /settings hub page and indexed
 * by global console search.
 */
export type SettingsOption = {
  key: string
  title: string
  description: string
  href: string
  icon: IconComponent
  iconColor: string
  permission?: string
}

/**
 * The single source of truth for all top-level settings options.
 *
 * It sits beside the nav config because the topbar's global search indexes it,
 * and a shell component may not reach into a route's `_lib`. The /settings hub
 * page reads it from here — a route importing the shell is the legal direction.
 *
 * Hand-maintained so every destination, label, icon, and permission is
 * visible at the line it is defined.
 */
export const SETTINGS_OPTIONS: SettingsOption[] = [
  {
    key: 'general',
    title: 'General',
    description: 'Platform name, timezone, and global defaults.',
    href: '/settings/general',
    icon: Settings,
    iconColor: 'text-muted-foreground',
  },
  {
    key: 'users',
    title: 'Users',
    description: 'Manage who has access to Console.',
    href: '/settings/users',
    icon: Users,
    iconColor: 'text-blue-600 dark:text-blue-400',
    permission: 'console:users',
  },
  {
    key: 'security',
    title: 'Security',
    description:
      'Auth policies, session limits, reserved usernames, and OAuth configuration.',
    href: '/settings/security',
    icon: KeyRound,
    iconColor: 'text-amber-600 dark:text-amber-400',
    permission: 'console:security',
  },
  {
    key: 'orgs',
    title: 'Organization provisioning',
    description:
      'Shared defaults and reconciliation runs for organization setup.',
    href: '/settings/orgs/provisioning',
    icon: Building2,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    key: 'notifications',
    title: 'Notifications',
    description: 'Alert channels and event subscriptions.',
    href: '/settings/notifications',
    icon: Waves,
    iconColor: 'text-violet-600 dark:text-violet-400',
  },
]
