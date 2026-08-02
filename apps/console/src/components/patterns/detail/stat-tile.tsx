import type { IconComponent } from '@876/ui/icons'
import type { ReactNode } from 'react'

/**
 * A compact quick-fact tile (icon chip + label + value) used in the quick-stats
 * row at the top of detail overviews. Shared by user and org views.
 */
export function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: IconComponent
  label: string
  value: ReactNode
}) {
  return (
    <div className="876-card flex items-center gap-3 p-3.5">
      <span className="bg-876-accent-surface text-876-accent-fg flex size-9 shrink-0 items-center justify-center rounded-lg">
        <Icon aria-hidden="true" className="size-[1.0625rem]" />
      </span>
      <div className="min-w-0">
        <p className="text-muted-foreground text-[0.6875rem] tracking-wide uppercase">
          {label}
        </p>
        <div className="truncate text-sm font-medium">{value}</div>
      </div>
    </div>
  )
}
