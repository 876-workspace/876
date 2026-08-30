import { Skeleton } from '@876/ui/skeleton'

export function CustomerSplitSkeleton() {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start">
      <div className="876-card shrink-0 overflow-hidden md:w-72 lg:w-80">
        <div className="border-876-surface-border border-b px-4 py-3">
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="space-y-1 p-2">
          {Array.from({ length: 5 }, (_, index) => (
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

      <section className="876-card min-w-0 flex-1 overflow-hidden">
        <div className="border-876-surface-border flex items-center gap-3.5 border-b px-6 py-5">
          <Skeleton className="size-12 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-3 w-28" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="size-8 rounded-md" />
          </div>
        </div>
        <div className="space-y-5 p-6">
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
        </div>
      </section>
    </div>
  )
}
