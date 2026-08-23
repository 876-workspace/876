import { cn } from '@876/core/utils'

import { statusBadgeClass } from '@/lib/format'

/**
 * Small monospace reference chip for IDs and slugs. Selectable so the value
 * can be copied straight from the page without a button.
 */
export function CopyChip({
  value,
  className,
}: {
  value: string
  className?: string
}) {
  return (
    <code
      className={cn(
        'bg-secondary/40 text-muted-foreground/90 rounded px-1.5 py-0.5 font-mono text-[10px] select-all',
        className
      )}
    >
      {value}
    </code>
  )
}

/** Lifecycle pill using the platform status palette (active=emerald, etc). */
export function PlanStatusBadge({ status }: { status: string }) {
  const active = status === 'active'
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-[11px] font-medium capitalize',
        active ? statusBadgeClass(status) : statusBadgeClass('archived')
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'mr-1.5 size-1.5 rounded-full',
          active ? 'bg-emerald-500' : 'bg-muted-foreground/40'
        )}
      />
      {status}
    </span>
  )
}
