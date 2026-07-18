'use client'

import { Skeleton } from '@876/ui/skeleton'
import { cn } from '@876/core/utils'

/**
 * Default skeleton while the shared widget session (token + Convex auth) is
 * establishing. Widget-specific data loading should use its own skeleton —
 * e.g. Notepad's card grid — after auth succeeds.
 */
export function WidgetPanelSkeleton({
  className,
  label = 'Loading',
}: {
  className?: string
  label?: string
}) {
  return (
    <div
      className={cn(
        'bg-background flex h-full min-h-0 flex-col gap-3 p-3',
        className
      )}
      role="status"
      aria-label={label}
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 min-w-0 flex-1 rounded-md" />
        <Skeleton className="h-8 w-20 shrink-0 rounded-md" />
      </div>
      <Skeleton className="h-3 w-28 rounded-md" />
      <div className="min-h-0 flex-1 space-y-2.5 pt-1">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-12 w-4/5 rounded-xl" />
      </div>
    </div>
  )
}
