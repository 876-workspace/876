import { Skeleton } from '@876/ui/skeleton'

/**
 * Scoped to this route. Held at the segment above, this fallback was also the
 * boundary over every sibling that ships its own shaped skeleton, so one
 * navigation painted neutral filler and then the real thing.
 */
export default function Loading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-9 w-64 max-w-full" />
      <div className="876-card space-y-5 p-5">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
