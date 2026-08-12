import { PageDescription, PageHeader, PageTitle } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'

export function DashboardHeader() {
  return (
    <PageHeader className="mb-8">
      <p className="text-brand mb-2 text-xs font-semibold tracking-widest uppercase">
        Workspace Overview
      </p>
      <PageTitle className="text-3xl font-extrabold tracking-tight">
        Dashboard
      </PageTitle>
      <PageDescription className="text-muted-foreground mt-2 text-lg">
        Monitor your commercial performance, active subscriptions, and
        outstanding receivables.
      </PageDescription>
    </PageHeader>
  )
}

export function DashboardContentSkeleton() {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="876-card space-y-4 p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="876-card space-y-4 p-6">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ))}
      </div>
    </>
  )
}
