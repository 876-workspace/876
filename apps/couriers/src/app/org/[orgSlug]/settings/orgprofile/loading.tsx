import { Page, PageHeader, PageTitle } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'

export default function Loading() {
  return (
    <Page>
      <Skeleton className="mb-4 h-5 w-16" />
      <PageHeader className="mb-6">
        <PageTitle>Organization profile</PageTitle>
      </PageHeader>
      <div className="space-y-6">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="876-card space-y-4 p-5">
            <Skeleton className="h-5 w-40" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          </div>
        ))}
      </div>
    </Page>
  )
}
