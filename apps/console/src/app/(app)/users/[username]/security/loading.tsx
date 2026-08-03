import { Skeleton } from '@876/ui/skeleton'

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-44 w-full" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}
