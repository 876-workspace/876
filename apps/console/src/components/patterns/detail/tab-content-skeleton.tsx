import { Skeleton } from '@876/ui/skeleton'

/**
 * Generic fallback for the content area below a detail header.
 *
 * It exists for the same reason as `DetailHeaderSkeleton`: a segment's
 * `loading.tsx` is the nearest Suspense boundary above every child route's
 * layout, so a list or overview fallback left at a parent segment replays that
 * page's shape whenever you open something beneath it. Once the real page has
 * been scoped into its own route group, the parent keeps this instead —
 * shape-neutral, so nothing recognisable flashes before the child arrives.
 */
export function TabContentSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-56 w-full rounded-lg" />
      ))}
    </div>
  )
}
