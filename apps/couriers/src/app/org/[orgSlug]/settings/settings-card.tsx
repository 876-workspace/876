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
 */
const GROUP_STYLES: Record<string, GroupStyle> = {
  organization: {
    Icon: BuildingOffice2Icon,
    tileClass: 'bg-blue-500/10',
    iconClass: 'text-blue-600 dark:text-blue-400',
  },
  users: {
    Icon: UsersIcon,
    tileClass: 'bg-violet-500/10',
    iconClass: 'text-violet-600 dark:text-violet-400',
  },
  modules: {
    Icon: Squares2X2Icon,
    tileClass: 'bg-amber-500/10',
    iconClass: 'text-amber-600 dark:text-amber-400',
  },
  portal: {
    Icon: GlobeAltIcon,
    tileClass: 'bg-sky-500/10',
    iconClass: 'text-sky-600 dark:text-sky-400',
  },
  rates: {
    Icon: ChartBarIcon,
    tileClass: 'bg-teal-500/10',
    iconClass: 'text-teal-600 dark:text-teal-400',
  },
  customization: {
    Icon: Cog6ToothIcon,
    tileClass: 'bg-slate-500/10',
    iconClass: 'text-slate-600 dark:text-slate-400',
  },
  communication: {
    Icon: EnvelopeIcon,
    tileClass: 'bg-indigo-500/10',
    iconClass: 'text-indigo-600 dark:text-indigo-400',
  },
  automation: {
    Icon: CommandLineIcon,
    tileClass: 'bg-orange-500/10',
    iconClass: 'text-orange-600 dark:text-orange-400',
  },
  billing: {
    Icon: CreditCardIcon,
    tileClass: 'bg-rose-500/10',
    iconClass: 'text-rose-600 dark:text-rose-400',
  },
}

const FALLBACK_STYLE: GroupStyle = {
  Icon: Cog6ToothIcon,
  tileClass: 'bg-muted',
  iconClass: 'text-muted-foreground',
}

type SettingsCardProps = {
  group: SettingsNavGroup
  orgSlug: string
}

export function SettingsCard({ group, orgSlug }: SettingsCardProps) {
  const { Icon, tileClass, iconClass } =
    GROUP_STYLES[group.icon] ?? FALLBACK_STYLE

  return (
    <section className="876-card p-5 transition-shadow hover:shadow-sm">
      <div className="mb-4 flex items-center gap-3 border-b pb-4">
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${tileClass}`}
        >
          <Icon className={`size-5 ${iconClass}`} />
        </span>
        <h2 className="text-[15px] font-semibold">{group.title}</h2>
      </div>
      <ul className="space-y-0.5">
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
