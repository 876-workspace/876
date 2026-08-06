import { Skeleton } from '@876/ui/skeleton'

/**
 * Scoped to this route. Held at the segment above, this fallback also covered
 * the sibling route group and the detail layout, which now streams on its own.
 */
export default function Loading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  )
}
