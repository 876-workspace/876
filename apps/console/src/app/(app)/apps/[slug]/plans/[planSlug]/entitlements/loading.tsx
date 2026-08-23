import { Skeleton } from '@876/ui/skeleton'

/**
 * Scoped to this route. Held at the segment above, this fallback was also the
 * boundary over every sibling that ships its own shaped skeleton, so one
 * navigation painted neutral filler and then the real thing.
 */
export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-[5.75rem] rounded-xl" />
        ))}
      </div>
    </div>
  )
}
