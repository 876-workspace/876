import { Skeleton } from '@876/ui/skeleton'

/**
 * Scoped to this route rather than the `packages` segment. A fallback there is
 * also the boundary over `(list)`, which ships its own card skeleton — so one
 * navigation painted this filler and then the real one.
 */
export default function Loading() {
  return (
    <div className="space-y-4 px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-96 w-full rounded-lg" />
    </div>
  )
}
