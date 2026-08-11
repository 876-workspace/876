import { Skeleton } from '@876/ui/skeleton'

export function CustomerOverviewSkeleton() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <CustomerOverviewCardSkeleton />
      <CustomerOverviewCardSkeleton />
    </div>
  )
}

function CustomerOverviewCardSkeleton() {
  return (
    <section className="876-card p-5">
      <Skeleton className="h-5 w-28" />
      <div className="mt-4 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </section>
  )
}
