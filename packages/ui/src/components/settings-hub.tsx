import type { ReactElement } from 'react'
import Link from 'next/link'
import { cn } from '@876/core/utils'

import { Badge } from './badge'
import {
  Activity,
  AdjustmentsHorizontalIcon,
  ChevronRightIcon,
  CircleStackIcon,
  Cog6ToothIcon,
  CreditCardIcon,
  DocumentDuplicateIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  KeyIcon,
  ReceiptPercentIcon,
  RectangleStackIcon,
  ShieldCheckIcon,
  TagIcon,
  UserIcon,
  UsersIcon,
  ArrowTrendingUpIcon,
} from '../icons'

export const SETTINGS_HUB_ICON_KEYS = [
  'access',
  'automation',
  'banking',
  'categories',
  'compliance',
  'currencies',
  'documents',
  'email',
  'integrations',
  'items',
  'members',
  'payments',
  'preferences',
  'priorities',
  'roles',
  'statuses',
  'taxes',
  'teams',
  'templates',
] as const

export type SettingsHubIconKey = (typeof SETTINGS_HUB_ICON_KEYS)[number]

export type SettingsAvailability = 'available' | 'planned'

export type SettingsHubItem = {
  label: string
  /** Icon keys remain serializable across the RSC boundary. */
  icon: SettingsHubIconKey
  availability: SettingsAvailability
  href?: string
}

export type SettingsHubGroup = { label: string; items: SettingsHubItem[] }

const SETTINGS_ITEM_CONFIG = {
  teams: {
    icon: UsersIcon,
    bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/30',
  },
  categories: {
    icon: TagIcon,
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/30',
  },
  priorities: {
    icon: ArrowTrendingUpIcon,
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/30',
  },
  statuses: {
    icon: AdjustmentsHorizontalIcon,
    bg: 'bg-cyan-500/10 dark:bg-cyan-500/20',
    text: 'text-cyan-600 dark:text-cyan-400',
    border: 'border-cyan-500/30',
  },
  automation: {
    icon: Activity,
    bg: 'bg-violet-500/10 dark:bg-violet-500/20',
    text: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-500/30',
  },
  email: {
    icon: EnvelopeIcon,
    bg: 'bg-rose-500/10 dark:bg-rose-500/20',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-500/30',
  },
  members: {
    icon: UserIcon,
    bg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
    text: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-500/30',
  },
  preferences: {
    icon: Cog6ToothIcon,
    bg: 'bg-slate-500/10 dark:bg-slate-500/20',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-500/30',
  },
  access: {
    icon: KeyIcon,
    bg: 'bg-violet-500/10 dark:bg-violet-500/20',
    text: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-500/30',
  },
  banking: {
    icon: CreditCardIcon,
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/30',
  },
  compliance: {
    icon: ShieldCheckIcon,
    bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/30',
  },
  currencies: {
    icon: GlobeAltIcon,
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/30',
  },
  documents: {
    icon: DocumentTextIcon,
    bg: 'bg-orange-500/10 dark:bg-orange-500/20',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-500/30',
  },
  integrations: {
    icon: CircleStackIcon,
    bg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
    text: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-500/30',
  },
  items: {
    icon: RectangleStackIcon,
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/30',
  },
  payments: {
    icon: CreditCardIcon,
    bg: 'bg-cyan-500/10 dark:bg-cyan-500/20',
    text: 'text-cyan-600 dark:text-cyan-400',
    border: 'border-cyan-500/30',
  },
  roles: {
    icon: KeyIcon,
    bg: 'bg-violet-500/10 dark:bg-violet-500/20',
    text: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-500/30',
  },
  taxes: {
    icon: ReceiptPercentIcon,
    bg: 'bg-rose-500/10 dark:bg-rose-500/20',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-500/30',
  },
  templates: {
    icon: DocumentDuplicateIcon,
    bg: 'bg-slate-500/10 dark:bg-slate-500/20',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-500/30',
  },
} satisfies Record<
  SettingsHubIconKey,
  { icon: typeof UsersIcon; bg: string; text: string; border: string }
>

export function SettingsHub({
  groups,
}: {
  groups: SettingsHubGroup[]
}): ReactElement {
  return (
    <div className="columns-1 sm:columns-2 lg:columns-3">
      {groups.map((group, index) => (
        <SettingsHubGroupCard key={`${group.label}-${index}`} group={group} />
      ))}
    </div>
  )
}

export function SettingsHubGroupCard({
  group,
}: {
  group: SettingsHubGroup
}): ReactElement {
  return (
    <section className="876-card mb-6 flex break-inside-avoid flex-col overflow-hidden">
      <div className="border-876-surface-border border-b px-5 py-3.5">
        <h2 className="text-muted-foreground text-[0.8125rem] font-semibold">
          {group.label}
        </h2>
      </div>
      <ul className="divide-border/60 divide-y">
        {group.items.map((item, index) => {
          const config = SETTINGS_ITEM_CONFIG[item.icon]
          const Icon = config.icon
          const isAvailable = item.availability === 'available' && Boolean(item.href)

          const content = (
            <>
              <div
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-lg border transition-colors',
                  config.bg,
                  config.text,
                  config.border
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
              </div>
              <span className="text-foreground text-[0.8125rem] font-medium transition-colors group-hover:text-sky-600 dark:group-hover:text-sky-400">
                {item.label}
              </span>
              {isAvailable ? (
                <ChevronRightIcon className="text-muted-foreground/40 group-hover:text-foreground/80 ml-auto size-4 shrink-0 transition-colors" />
              ) : (
                <Badge variant="secondary" className="ml-auto text-[0.625rem]">
                  Planned
                </Badge>
              )}
            </>
          )

          return (
            <li key={`${item.label}-${index}`}>
              {isAvailable ? (
                <Link
                  href={item.href!}
                  className="group hover:bg-muted/40 flex items-center gap-3.5 px-5 py-3.5 transition-colors"
                >
                  {content}
                </Link>
              ) : (
                <div className="flex items-center gap-3.5 px-5 py-3.5 opacity-70">
                  {content}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
