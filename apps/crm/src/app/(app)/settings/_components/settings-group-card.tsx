import Link from 'next/link'
import type { ComponentType, SVGProps } from 'react'

import {
  Activity,
  AdjustmentsHorizontalIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  EnvelopeIcon,
  TagIcon,
  TrendingUp,
  UsersIcon,
} from '@876/ui/icons'

import type { SettingsIconKey, SettingsNavGroup } from '../_lib/settings-nav'

type Icon = ComponentType<SVGProps<SVGSVGElement>>

export const SETTINGS_ICON_RESOLVER: Record<SettingsIconKey, Icon> = {
  automation: Activity,
  categories: TagIcon,
  email: EnvelopeIcon,
  members: UsersIcon,
  preferences: Cog6ToothIcon,
  priorities: TrendingUp,
  statuses: AdjustmentsHorizontalIcon,
  teams: ClipboardDocumentListIcon,
}

export function SettingsGroupCard({ group }: { group: SettingsNavGroup }) {
  return (
    <section className="876-card mb-6 break-inside-avoid overflow-hidden">
      <h2 className="876-section-title border-b px-5 py-4">{group.label}</h2>
      <ul className="divide-y">
        {group.items.map((item) => {
          const Icon = SETTINGS_ICON_RESOLVER[item.icon]
          const content = (
            <>
              <span className="876-icon-tile">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span className="font-medium">{item.label}</span>
              {item.availability === 'planned' ? (
                <span className="text-muted-foreground ml-auto text-xs">
                  Planned
                </span>
              ) : null}
            </>
          )

          return (
            <li key={item.label}>
              {item.availability === 'available' && item.href ? (
                <Link
                  href={item.href}
                  className="hover:bg-muted/50 flex items-center gap-3 px-5 py-3.5 transition-colors"
                >
                  {content}
                </Link>
              ) : (
                <div className="flex items-center gap-3 px-5 py-3.5">
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
