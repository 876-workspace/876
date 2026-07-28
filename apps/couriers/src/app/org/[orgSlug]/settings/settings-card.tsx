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
  organization: { Icon: BuildingOffice2Icon, tone: 'sky' },
  users: { Icon: UsersIcon, tone: 'cyan' },
  modules_core: { Icon: Squares2X2Icon, tone: 'blue' },
  modules_ops: { Icon: QueueListIcon, tone: 'teal' },
  portal: { Icon: GlobeAltIcon, tone: 'sky' },
  rates: { Icon: ChartBarIcon, tone: 'cyan' },
  customization: { Icon: PaintBrushIcon, tone: 'blue' },
  communication: { Icon: EnvelopeIcon, tone: 'teal' },
  automation: { Icon: CommandLineIcon, tone: 'sky' },
  billing: { Icon: CreditCardIcon, tone: 'cyan' },
}

const FALLBACK_STYLE: SectionStyle = { Icon: Cog6ToothIcon, tone: 'blue' }

type SettingsCardProps = {
  group: SettingsNavGroup
  orgSlug: string
}

export function SettingsCard({ group, orgSlug }: SettingsCardProps) {
  const { Icon, tone } = GROUP_STYLES[group.icon] ?? FALLBACK_STYLE

  return (
    <section className="876-card p-4 transition-shadow hover:shadow-sm">
      <SectionHeaderPill Icon={Icon} title={group.title} tone={tone} />

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
