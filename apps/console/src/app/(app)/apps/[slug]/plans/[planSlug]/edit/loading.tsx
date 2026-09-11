import { Skeleton } from '@876/ui/skeleton'

/**
 * Renders inside the plan card's body, which already carries the header and
 * tabs — so only the form fields shimmer, with no title or nested card.
 */
export default function Loading() {
  return (
    <div className="space-y-5">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  )
}
