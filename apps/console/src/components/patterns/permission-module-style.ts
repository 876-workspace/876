import {
  Building2,
  ChartPieIcon,
  CreditCardIcon,
  Fingerprint,
  KeyIcon,
  Link2,
  ShieldCheck,
  SquaresPlusIcon,
  Terminal,
  Users,
} from '@876/ui/icons'

/**
 * Per-module identity: its icon and its tile colour.
 *
 * Colour here is identity, not state — a module keeps the same hue whatever
 * the operator holds, so the list stays scannable by shape and colour rather
 * than turning into a grey wall for a low-privilege role. How much of a module
 * is held is carried by the granted/total count beside it.
 *
 * Emerald is deliberately absent: it means "granted" on the permission pills,
 * and reusing it for a module would make the two readings compete.
 */
const MODULE_STYLE = {
  console: {
    console: {
      icon: Terminal,
      tile: 'bg-indigo-500/10 text-indigo-600 ring-indigo-500/20 dark:text-indigo-400',
    },
    users: {
      icon: Users,
      tile: 'bg-sky-500/10 text-sky-600 ring-sky-500/20 dark:text-sky-400',
    },
    organizations: {
      icon: Building2,
      tile: 'bg-violet-500/10 text-violet-600 ring-violet-500/20 dark:text-violet-400',
    },
    memberships: {
      icon: Link2,
      tile: 'bg-fuchsia-500/10 text-fuchsia-600 ring-fuchsia-500/20 dark:text-fuchsia-400',
    },
    apps: {
      icon: SquaresPlusIcon,
      tile: 'bg-cyan-500/10 text-cyan-600 ring-cyan-500/20 dark:text-cyan-400',
    },
    roles: {
      icon: ShieldCheck,
      tile: 'bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-400',
    },
    team: {
      icon: Fingerprint,
      tile: 'bg-rose-500/10 text-rose-600 ring-rose-500/20 dark:text-rose-400',
    },
  },
  billing: {
    customers: {
      icon: Users,
      tile: 'bg-purple-500/10 text-purple-600 ring-purple-500/20 dark:text-purple-400',
    },
    payments: {
      icon: CreditCardIcon,
      tile: 'bg-purple-500/10 text-purple-600 ring-purple-500/20 dark:text-purple-400',
    },
    reports: {
      icon: ChartPieIcon,
      tile: 'bg-purple-500/10 text-purple-600 ring-purple-500/20 dark:text-purple-400',
    },
  },
  couriers: {
    customers: {
      icon: Users,
      tile: 'bg-sky-500/10 text-sky-600 ring-sky-500/20 dark:text-sky-400',
    },
    payments: {
      icon: CreditCardIcon,
      tile: 'bg-sky-500/10 text-sky-600 ring-sky-500/20 dark:text-sky-400',
    },
    reports: {
      icon: ChartPieIcon,
      tile: 'bg-sky-500/10 text-sky-600 ring-sky-500/20 dark:text-sky-400',
    },
  },
  crm: {
    customers: {
      icon: Users,
      tile: 'bg-violet-500/10 text-violet-600 ring-violet-500/20 dark:text-violet-400',
    },
    reports: {
      icon: ChartPieIcon,
      tile: 'bg-violet-500/10 text-violet-600 ring-violet-500/20 dark:text-violet-400',
    },
  },
  invoice: {
    customers: {
      icon: Users,
      tile: 'bg-orange-500/10 text-orange-600 ring-orange-500/20 dark:text-orange-400',
    },
    payments: {
      icon: CreditCardIcon,
      tile: 'bg-orange-500/10 text-orange-600 ring-orange-500/20 dark:text-orange-400',
    },
    reports: {
      icon: ChartPieIcon,
      tile: 'bg-orange-500/10 text-orange-600 ring-orange-500/20 dark:text-orange-400',
    },
  },
  projects: {
    reports: {
      icon: ChartPieIcon,
      tile: 'bg-blue-500/10 text-blue-600 ring-blue-500/20 dark:text-blue-400',
    },
  },
} as const

const FALLBACK_STYLE = {
  icon: KeyIcon,
  tile: 'bg-muted text-muted-foreground ring-border/60',
}

/** Resolves a module style by its owning group first, avoiding name collisions. */
export function moduleStyle(groupKey: string, moduleKey: string) {
  const groupStyles = MODULE_STYLE[groupKey as keyof typeof MODULE_STYLE]
  if (!groupStyles) return FALLBACK_STYLE

  return groupStyles[moduleKey as keyof typeof groupStyles] ?? FALLBACK_STYLE
}
