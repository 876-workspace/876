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

import {
  SectionHeaderPill,
  type SectionHeaderTone,
} from './section-header-pill'

type SectionIcon = ComponentType<SVGProps<SVGSVGElement>>

type SectionStyle = {
  Icon: SectionIcon
  tone: SectionHeaderTone
}

const GROUP_STYLES: Record<string, SectionStyle> = {
  organization: { Icon: BuildingOffice2Icon, tone: 'indigo' },
  users: { Icon: UsersIcon, tone: 'violet' },
  modules_core: { Icon: Squares2X2Icon, tone: 'fuchsia' },
  modules_ops: { Icon: QueueListIcon, tone: 'rose' },
  portal: { Icon: GlobeAltIcon, tone: 'cyan' },
  rates: { Icon: ChartBarIcon, tone: 'emerald' },
  customization: { Icon: PaintBrushIcon, tone: 'orange' },
  communication: { Icon: EnvelopeIcon, tone: 'teal' },
  automation: { Icon: CommandLineIcon, tone: 'lime' },
  billing: { Icon: CreditCardIcon, tone: 'amber' },
}

const FALLBACK_STYLE: SectionStyle = { Icon: Cog6ToothIcon, tone: 'indigo' }

type SettingsCardProps = {
  group: SettingsNavGroup
  orgSlug: string
}

export function SettingsCard({ group, orgSlug }: SettingsCardProps) {
  const { Icon, tone } = GROUP_STYLES[group.icon] ?? FALLBACK_STYLE

  return (
    <section className="876-card mb-6 break-inside-avoid overflow-hidden transition-shadow">
      <SectionHeaderPill Icon={Icon} title={group.title} tone={tone} />

      <ul className="space-y-0.5 px-4 pt-2 pb-4">
        {group.items.map((item) => (
          <li key={item.title}>
            {item.href ? (
              <Link
                href={`/${orgSlug}${item.href}`}
                className="group/item hover:bg-muted flex items-center justify-between rounded-md py-1.5 pr-2.5 pl-6 text-sm transition-colors"
              >
                <span className="text-foreground/90 group-hover/item:text-foreground">
                  {item.title}
                </span>
                <ChevronRightIcon className="text-muted-foreground size-4 -translate-x-1 opacity-0 transition-all group-hover/item:translate-x-0 group-hover/item:opacity-100" />
              </Link>
            ) : (
              <span className="text-muted-foreground/45 block py-1.5 pr-2.5 pl-6 text-sm">
                {item.title}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
