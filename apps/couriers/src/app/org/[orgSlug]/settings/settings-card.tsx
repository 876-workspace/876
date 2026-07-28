import type { ComponentType, SVGProps } from 'react'
import Link from 'next/link'
import type { SettingsNavGroup } from '@876/settings/types'
import {
  BuildingOffice2Icon,
  ChartBarIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
  CommandLineIcon,
  CreditCardIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  QueueListIcon,
  Squares2X2Icon,
  UsersIcon,
} from '@876/ui/icons'

type GroupStyle = {
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  /** Tinted header band — the card's accent. */
  headerClass: string
  iconClass: string
}

/**
 * Icons and accent hues live here rather than in the nav registry: the registry
 * crosses the server/client boundary, so it carries a string key and this map
 * resolves it to a component on the app side.
 */
const GROUP_STYLES: Record<string, GroupStyle> = {
  organization: {
    Icon: BuildingOffice2Icon,
    headerClass: 'bg-blue-500/8 dark:bg-blue-500/12',
    iconClass: 'text-blue-600 dark:text-blue-400',
  },
  users: {
    Icon: UsersIcon,
    headerClass: 'bg-violet-500/8 dark:bg-violet-500/12',
    iconClass: 'text-violet-600 dark:text-violet-400',
  },
  modules: {
    Icon: Squares2X2Icon,
    headerClass: 'bg-amber-500/8 dark:bg-amber-500/12',
    iconClass: 'text-amber-600 dark:text-amber-400',
  },
  portal: {
    Icon: GlobeAltIcon,
    headerClass: 'bg-sky-500/8 dark:bg-sky-500/12',
    iconClass: 'text-sky-600 dark:text-sky-400',
  },
  rates: {
    Icon: ChartBarIcon,
    headerClass: 'bg-teal-500/8 dark:bg-teal-500/12',
    iconClass: 'text-teal-600 dark:text-teal-400',
  },
  customization: {
    Icon: Cog6ToothIcon,
    headerClass: 'bg-slate-500/8 dark:bg-slate-500/12',
    iconClass: 'text-slate-600 dark:text-slate-400',
  },
  communication: {
    Icon: EnvelopeIcon,
    headerClass: 'bg-indigo-500/8 dark:bg-indigo-500/12',
    iconClass: 'text-indigo-600 dark:text-indigo-400',
  },
  automation: {
    Icon: CommandLineIcon,
    headerClass: 'bg-orange-500/8 dark:bg-orange-500/12',
    iconClass: 'text-orange-600 dark:text-orange-400',
  },
  operations: {
    Icon: QueueListIcon,
    headerClass: 'bg-cyan-500/8 dark:bg-cyan-500/12',
    iconClass: 'text-cyan-600 dark:text-cyan-400',
  },
  commerce: {
    Icon: ChartBarIcon,
    headerClass: 'bg-emerald-500/8 dark:bg-emerald-500/12',
    iconClass: 'text-emerald-600 dark:text-emerald-400',
  },
  billing: {
    Icon: CreditCardIcon,
    headerClass: 'bg-rose-500/8 dark:bg-rose-500/12',
    iconClass: 'text-rose-600 dark:text-rose-400',
  },
}

const FALLBACK_STYLE: GroupStyle = {
  Icon: Cog6ToothIcon,
  headerClass: 'bg-muted',
  iconClass: 'text-muted-foreground',
}

type SettingsCardProps = {
  group: SettingsNavGroup
  orgSlug: string
}

export function SettingsCard({ group, orgSlug }: SettingsCardProps) {
  const { Icon, headerClass, iconClass } =
    GROUP_STYLES[group.icon] ?? FALLBACK_STYLE

  return (
    <section className="876-card flex h-full flex-col overflow-hidden p-0 transition-shadow hover:shadow-sm">
      <div
        className={`flex items-center gap-2.5 border-b px-5 py-3.5 ${headerClass}`}
      >
        <Icon className={`size-[18px] shrink-0 ${iconClass}`} />
        <h2 className="text-[15px] font-semibold">{group.title}</h2>
      </div>
      <ul className="flex-1 space-y-0.5 p-4">
        {group.items.map((item) =>
          item.href ? (
            <li key={item.title}>
              <Link
                href={`/org/${orgSlug}${item.href}`}
                className="group/item hover:bg-muted -mx-2 flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors"
              >
                <span className="text-foreground/90 group-hover/item:text-foreground">
                  {item.title}
                </span>
                <ChevronRightIcon className="text-muted-foreground size-4 -translate-x-1 opacity-0 transition-all group-hover/item:translate-x-0 group-hover/item:opacity-100" />
              </Link>
            </li>
          ) : (
            <li
              key={item.title}
              className="text-muted-foreground/45 px-2 py-1.5 text-sm"
            >
              {item.title}
            </li>
          )
        )}
      </ul>
    </section>
  )
}
