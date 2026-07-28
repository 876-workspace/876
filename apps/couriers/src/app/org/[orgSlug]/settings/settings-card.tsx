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
  PaintBrushIcon,
  QueueListIcon,
  Squares2X2Icon,
  UsersIcon,
} from '@876/ui/icons'

import { SectionHeaderPill } from './section-header-pill'

type SectionIcon = ComponentType<SVGProps<SVGSVGElement>>

const GROUP_ICONS: Record<string, SectionIcon> = {
  organization: BuildingOffice2Icon,
  users: UsersIcon,
  modules_core: Squares2X2Icon,
  modules_ops: QueueListIcon,
  portal: GlobeAltIcon,
  rates: ChartBarIcon,
  customization: PaintBrushIcon,
  communication: EnvelopeIcon,
  automation: CommandLineIcon,
  billing: CreditCardIcon,
}

type SettingsCardProps = {
  group: SettingsNavGroup
  orgSlug: string
}

export function SettingsCard({ group, orgSlug }: SettingsCardProps) {
  const Icon = GROUP_ICONS[group.icon] ?? Cog6ToothIcon

  return (
    <section className="876-card p-4 transition-shadow hover:shadow-sm">
      <SectionHeaderPill Icon={Icon} title={group.title} />

      <ul className="space-y-1">
        {group.items.map((item) => (
          <li key={item.title}>
            {item.href ? (
              <Link
                href={`/org/${orgSlug}${item.href}`}
                className="group/item hover:bg-muted flex items-center justify-between rounded-md py-2 pr-2.5 pl-10 text-sm transition-colors"
              >
                <span className="text-foreground/90 group-hover/item:text-foreground">
                  {item.title}
                </span>
                <ChevronRightIcon className="text-muted-foreground size-4 -translate-x-1 opacity-0 transition-all group-hover/item:translate-x-0 group-hover/item:opacity-100" />
              </Link>
            ) : (
              <span className="text-muted-foreground/45 block py-2 pr-2.5 pl-10 text-sm">
                {item.title}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
