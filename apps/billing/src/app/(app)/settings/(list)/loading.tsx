import { Page } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'

export default function Loading() {
  return (
    <Page hub>
      <div className="mb-8">
        <h1 className="text-lg font-medium">Settings</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Configure money, access, and workspace behaviour.
        </p>
      </div>
      <div
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        aria-hidden="true"
      >
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="876-card space-y-3 p-5">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </Page>
  )
}
