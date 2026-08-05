import { Skeleton } from '@876/ui/skeleton'

/**
 * Fallback for the team member detail and roles pages. The roster list keeps
 * its own table skeleton in `(list)/loading.tsx`, so navigating into a member
 * no longer clears the roster and re-renders it as a table.
 */
export default function Loading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  )
}
