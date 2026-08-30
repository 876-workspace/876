import { Skeleton } from '@876/ui/skeleton'

/** Fallback for the create card, scoped to this route only. */
export default function Loading() {
  return (
    <div className="876-card h-full space-y-4 p-6">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  )
}
