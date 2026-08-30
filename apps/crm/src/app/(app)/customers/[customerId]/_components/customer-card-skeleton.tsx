import { Skeleton } from '@876/ui/skeleton'

/** Fallback for the customer card. Mirrors the header + tab strip + body. */
export function CustomerCardSkeleton() {
  return (
    <div className="876-card flex h-full min-w-0 flex-col overflow-hidden">
      <div className="border-876-surface-border flex items-start gap-4 border-b px-6 py-5">
        <Skeleton className="size-14 shrink-0 rounded-2xl sm:size-16" />
        <div className="min-w-0 flex-1 space-y-2 pt-1">
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-3 w-72" />
        </div>
        <Skeleton className="h-8 w-16 shrink-0 rounded-lg" />
      </div>
      <div className="border-876-surface-border flex shrink-0 gap-6 border-b px-6 pt-3 pb-3">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-3 w-16" />
        ))}
      </div>
      <div className="space-y-4 p-6">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    </div>
  )
}
