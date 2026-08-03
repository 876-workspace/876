import { Skeleton } from '@876/ui/skeleton'

export default function Loading() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Skeleton className="h-80" />
      <Skeleton className="h-80" />
    </div>
  )
}
