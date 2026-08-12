import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'

const COLUMNS = [
  { label: 'Record', cell: 'avatar' as const },
  { label: 'Details' },
  { label: 'Status', cell: 'badge' as const },
  { label: 'Updated' },
]

/**
 * Shared fallback for data-backed workspace routes.
 *
 * The same server-only shell is rendered from route `loading.tsx` files and
 * nested Suspense boundaries. This lets Next.js partially prefetch sidebar
 * destinations and avoids a second, visually different loading state while
 * their server data streams in.
 */
export function BillingListPageSkeleton() {
  return (
    <Page>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>
      <DataTableSkeleton columns={COLUMNS} />
    </Page>
  )
}

export function BillingDashboardSkeleton() {
  return (
    <Page className="pb-12">
      <div className="mb-8 space-y-3">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>
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
    </Page>
  )
}
