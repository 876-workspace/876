import { PageDescription, PageHeader, PageTitle } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'

export function ReportsHeader() {
  return (
    <PageHeader>
      <PageTitle>Reports</PageTitle>
      <PageDescription>
        Commercial reporting is intentionally grouped by currency. No FX
        conversion, tax filing, payment settlement, or revenue recognition is
        implied by these figures.
      </PageDescription>
    </PageHeader>
  )
}

export function ReportsFallback() {
  return (
    <section className="grid gap-4 lg:grid-cols-2" aria-hidden="true">
      {Array.from({ length: 2 }, (_, index) => (
        <div key={index} className="876-card space-y-4 p-5">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ))}
    </section>
  )
}
