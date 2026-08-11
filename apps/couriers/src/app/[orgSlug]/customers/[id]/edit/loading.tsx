import { Page, PageHeader, PageTitle } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'

export default function Loading() {
  return (
    <Page>
      <Skeleton className="mb-4 h-4 w-20" />
      <PageHeader className="mb-8">
        <PageTitle>Edit customer</PageTitle>
      </PageHeader>
      <Skeleton className="h-96 w-full" />
    </Page>
  )
}
