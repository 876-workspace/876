import Link from 'next/link'
import type { ComponentType, SVGProps } from 'react'
import { ChevronRightIcon } from '@876/ui/icons'

import type { SettingsItem } from './settings-groups'

type SettingsCardProps = {
  title: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  tileClass: string
  iconClass: string
  items: SettingsItem[]
  orgSlug: string
}

export function SettingsCard({
  title,
  icon: Icon,
  tileClass,
  iconClass,
  items,
  orgSlug,
}: SettingsCardProps) {
  return (
    <section className="876-card p-5 transition-shadow hover:shadow-sm">
      <div className="mb-4 flex items-center gap-3 border-b pb-4">
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${tileClass}`}
        >
          <Icon className={`size-5 ${iconClass}`} />
        </span>
        <h2 className="text-[15px] font-semibold">{title}</h2>
      </div>
      <ul className="space-y-0.5">
        {items.map((item) =>
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
