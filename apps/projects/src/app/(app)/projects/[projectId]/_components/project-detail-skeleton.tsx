import { Skeleton } from '@876/ui/skeleton'

export function ProjectDetailSkeleton() {
  return (
    <div aria-label="Loading project details" className="space-y-8">
      <section className="876-card space-y-4 p-6">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </section>
      <section className="876-card grid gap-6 p-6 sm:grid-cols-3">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </section>
      <section className="876-card p-6">
        <Skeleton className="h-40 w-full" />
      </section>
    </div>
  )
}
