import Link from 'next/link'
import { cn } from '@876/core/utils'
import { Badge } from '@876/ui/badge'
import { ChevronRightIcon } from '@876/ui/icons'
import type { SettingsNavGroup } from '../_lib/settings-nav'
import {
  SETTINGS_ICON_RESOLVER,
  SETTINGS_ITEM_CONFIG,
} from '../_lib/settings-nav'

export { SETTINGS_ICON_RESOLVER }

export function SettingsGroupCard({ group }: { group: SettingsNavGroup }) {
  return (
    <section className="876-card flex flex-col overflow-hidden">
      <div className="border-876-surface-border border-b px-5 py-3.5">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          {group.label}
        </h2>
      </div>
      <ul className="divide-border/60 divide-y">
        {group.items.map((item) => {
          const config = SETTINGS_ITEM_CONFIG[item.icon]
          const Icon = config.icon

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
              {item.availability === 'planned' ? (
                <Badge variant="secondary" className="ml-auto text-[0.625rem]">
                  Planned
                </Badge>
              ) : (
                <ChevronRightIcon className="text-muted-foreground/40 group-hover:text-foreground/80 ml-auto size-4 shrink-0 transition-colors" />
              )}
            </>
          )

          return (
            <li key={item.label}>
              {item.availability === 'available' && item.href ? (
                <Link
                  href={item.href}
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
