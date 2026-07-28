import type { ComponentType, SVGProps } from 'react'
import Link from 'next/link'
import type { SettingsNavGroup, SettingsNavItem } from '@876/settings/types'
import {
  BuildingOffice2Icon,
  ChartBarIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
  CommandLineIcon,
  CreditCardIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  PaintBrushIcon,
  Squares2X2Icon,
  UsersIcon,
} from '@876/ui/icons'

type GroupStyle = {
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  tileClass: string
  iconClass: string
}

/**
 * Icons and accent hues live here rather than in the nav registry: the registry
 * crosses the server/client boundary, so it carries a string key and this map
 * resolves it to a component on the app side.
 *
 * Zoho Books-style compact combined headers wrap icon and text together in a subtle backdrop.
 */
const GROUP_STYLES: Record<string, GroupStyle> = {
  organization: {
    Icon: BuildingOffice2Icon,
    tileClass: 'bg-sky-500/10 text-sky-900 dark:bg-sky-500/20 dark:text-sky-200',
    iconClass: 'text-sky-600 dark:text-sky-400',
  },
  users: {
    Icon: UsersIcon,
    tileClass:
      'bg-violet-500/10 text-violet-900 dark:bg-violet-500/20 dark:text-violet-200',
    iconClass: 'text-violet-600 dark:text-violet-400',
  },
  modules: {
    Icon: Squares2X2Icon,
    tileClass:
      'bg-amber-500/10 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200',
    iconClass: 'text-amber-600 dark:text-amber-400',
  },
  portal: {
    Icon: GlobeAltIcon,
    tileClass:
      'bg-blue-500/10 text-blue-900 dark:bg-blue-500/20 dark:text-blue-200',
    iconClass: 'text-blue-600 dark:text-blue-400',
  },
  rates: {
    Icon: ChartBarIcon,
    tileClass:
      'bg-emerald-500/10 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-200',
    iconClass: 'text-emerald-600 dark:text-emerald-400',
  },
  customization: {
    Icon: PaintBrushIcon,
    tileClass:
      'bg-slate-500/10 text-slate-900 dark:bg-slate-500/20 dark:text-slate-200',
    iconClass: 'text-slate-600 dark:text-slate-400',
  },
  communication: {
    Icon: EnvelopeIcon,
    tileClass:
      'bg-indigo-500/10 text-indigo-900 dark:bg-indigo-500/20 dark:text-indigo-200',
    iconClass: 'text-indigo-600 dark:text-indigo-400',
  },
  automation: {
    Icon: CommandLineIcon,
    tileClass:
      'bg-orange-500/10 text-orange-900 dark:bg-orange-500/20 dark:text-orange-200',
    iconClass: 'text-orange-600 dark:text-orange-400',
  },
  billing: {
    Icon: CreditCardIcon,
    tileClass:
      'bg-rose-500/10 text-rose-900 dark:bg-rose-500/20 dark:text-rose-200',
    iconClass: 'text-rose-600 dark:text-rose-400',
  },
}

const FALLBACK_STYLE: GroupStyle = {
  Icon: Cog6ToothIcon,
  tileClass: 'bg-muted text-muted-foreground',
  iconClass: 'text-muted-foreground',
}

type SettingsCardProps = {
  group: SettingsNavGroup
  orgSlug: string
}

export function SettingsCard({ group, orgSlug }: SettingsCardProps) {
  const { Icon, tileClass, iconClass } =
    GROUP_STYLES[group.icon] ?? FALLBACK_STYLE

  const renderItem = (item: SettingsNavItem) => (
    <li key={item.title}>
      {item.href ? (
        <Link
          href={`/org/${orgSlug}${item.href}`}
          className="group/item hover:bg-muted -mx-2 flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors"
        >
          <span className="text-foreground/90 group-hover/item:text-foreground">
            {item.title}
          </span>
          <ChevronRightIcon className="text-muted-foreground size-4 -translate-x-1 opacity-0 transition-all group-hover/item:translate-x-0 group-hover/item:opacity-100" />
        </Link>
      ) : (
        <span className="text-muted-foreground/45 block px-2 py-1.5 text-sm">
          {item.title}
        </span>
      )}
    </li>
  )

  // Split Modules into two logical sub-groups for cleaner vertical flow
  const isModulesGroup = group.key === 'modules'
  const coreModuleTitles = new Set([
    'General',
    'Customers',
    'Items',
    'Packages',
    'Pre-alerts',
  ])

  const coreItems = isModulesGroup
    ? group.items.filter((item) => coreModuleTitles.has(item.title))
    : []
  const opsItems = isModulesGroup
    ? group.items.filter((item) => !coreModuleTitles.has(item.title))
    : []

  return (
    <section className="876-card p-4 transition-shadow hover:shadow-sm">
      {/* Compact, pill-style combined header without horizontal divider */}
      <div className="mb-3 flex items-center">
        <div
          className={`inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-semibold ${tileClass}`}
        >
          <Icon className={`size-4 shrink-0 ${iconClass}`} />
          <h2>{group.title}</h2>
        </div>
      </div>

      {isModulesGroup ? (
        <div className="space-y-3">
          <div>
            <h3 className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/75">
              Core & Setup
            </h3>
            <ul className="space-y-0.5">{coreItems.map(renderItem)}</ul>
          </div>
          <div>
            <h3 className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/75">
              Operations & Fulfillment
            </h3>
            <ul className="space-y-0.5">{opsItems.map(renderItem)}</ul>
          </div>
        </div>
      ) : (
        <ul className="space-y-0.5">{group.items.map(renderItem)}</ul>
      )}
    </section>
  )
}
