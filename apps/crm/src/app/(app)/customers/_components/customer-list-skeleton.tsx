import { Skeleton } from '@876/ui/skeleton'

/** Fallback for the list column. Mirrors the condensed list's row rhythm. */
export function CustomerListSkeleton() {
  return (
    <div className="876-card flex h-full min-h-0 flex-col overflow-hidden">
      <div className="border-876-surface-border border-b px-4 py-3">
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="space-y-1 p-2">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex items-center gap-2.5 px-2 py-2">
            <Skeleton className="size-7 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
