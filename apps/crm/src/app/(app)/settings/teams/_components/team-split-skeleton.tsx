import { Skeleton } from '@876/ui/skeleton'

/** Mirrors the selected-team split view while its server-loaded list resolves. */
export function TeamSplitSkeleton() {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start">
      <div className="876-card shrink-0 overflow-hidden md:w-72 lg:w-80">
        <div className="border-876-surface-border border-b px-4 py-3">
          <Skeleton className="h-4 w-12" />
        </div>
        <div className="space-y-1 p-2">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="flex items-center gap-2.5 px-2 py-2">
              <Skeleton className="size-7 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-2.5 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <section className="876-card min-w-0 flex-1 overflow-hidden">
        <div className="border-876-surface-border flex items-center gap-3.5 border-b px-6 py-5">
          <Skeleton className="size-12 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-3.5 w-32" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-16 rounded-md" />
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="size-8 rounded-md" />
          </div>
        </div>
        <div className="border-876-surface-border border-b px-6 pt-3.5 pb-3">
          <Skeleton className="h-7 w-64 rounded-lg" />
        </div>
        <div className="space-y-4 p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      </section>
    </div>
  )
}
