import { Page } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'

export default function Loading() {
  return (
    <Page>
      <Skeleton className="mb-4 h-5 w-16" />
      <Skeleton className="mb-6 h-9 w-full" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="876-card space-y-4 p-4">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </Page>
  )
}
