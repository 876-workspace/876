import { Skeleton } from '@876/ui/skeleton'

export function IssueDetailSkeleton() {
  return (
    <div aria-label="Loading issue details" className="space-y-8">
      <section className="876-card space-y-4 p-6">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-7 w-80" />
      </section>
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="876-card space-y-4 p-6 lg:col-span-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-48 w-full" />
        </section>
        <section className="876-card p-6">
          <Skeleton className="h-48 w-full" />
        </section>
      </div>
    </div>
  )
}
