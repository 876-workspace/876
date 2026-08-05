import { Skeleton } from '@876/ui/skeleton'

/**
 * Fallback for the detail and create routes under this segment. The list keeps
 * its own table/card skeleton in `(list)/loading.tsx`: a list fallback here
 * would be the nearest boundary above a child route's layout, so opening a row
 * would blank the list and re-render it before the record appeared.
 */
export default function Loading() {
  return (
    <div className="space-y-4 px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-96 w-full rounded-lg" />
    </div>
  )
}
