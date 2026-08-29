import { Skeleton } from '@876/ui/skeleton'

/** Mirrors the selected-member split view while its server-loaded list resolves. */
export function TeamSplitSkeleton() {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start">
      <div className="876-card shrink-0 overflow-hidden md:w-72 lg:w-80">
        <div className="border-876-surface-border border-b px-4 py-3">
          <Skeleton className="h-4 w-10" />
        </div>
        <div className="space-y-1 p-2">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="flex items-center gap-2.5 px-2 py-2">
              <Skeleton className="size-7 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-2.5 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <section className="876-card min-w-0 flex-1 overflow-hidden">
        <div className="border-876-surface-border flex items-center gap-3 border-b px-6 py-4">
          <Skeleton className="size-10 shrink-0 rounded-md" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3.5 w-52" />
          </div>
          <Skeleton className="size-8 shrink-0 rounded-md" />
        </div>
        <div className="border-876-surface-border border-b px-6 pt-4 pb-3">
          <Skeleton className="h-8 w-72 rounded-lg" />
        </div>
        <div className="space-y-4 p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </section>
    </div>
  )
}
