import type { ReactNode } from 'react'
import type { IconComponent } from '@876/ui/icons'
import { cn } from '@876/core/utils'

import { IconChip, type Tone } from '../overview-ui'

/**
 * The one card shell every variant builds from. Keeping the chrome identical
 * across all three is what makes them comparable — the differences under
 * evaluation are composition and density, not border radius.
 */
export function Panel({
  title,
  icon,
  tone,
  count,
  action,
  className,
  children,
}: {
  title: string
  icon: IconComponent
  tone?: Tone
  count?: number
  action?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section className={cn('876-card overflow-hidden', className)}>
      <header className="border-876-surface-border flex items-center gap-2.5 border-b px-4 py-3">
        <IconChip icon={icon} tone={tone} className="size-7 shrink-0" />
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">
          {title}
        </h2>
        {typeof count === 'number' && count > 0 && (
          <span className="bg-muted text-muted-foreground inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium tabular-nums">
            {count}
          </span>
        )}
        {action}
      </header>
      <div className="p-4">{children}</div>
    </section>
  )
}

/** Short, non-prose empty state. A bare line, per the UI copy rule. */
export function PanelEmpty({ children }: { children: ReactNode }) {
  return (
    <p className="text-muted-foreground py-6 text-center text-sm">{children}</p>
  )
}
