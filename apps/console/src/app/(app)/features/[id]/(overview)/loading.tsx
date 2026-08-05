import { Skeleton } from '@876/ui/skeleton'

export default function Loading() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Skeleton className="h-64" />
      <Skeleton className="h-64" />
      <Skeleton className="h-48" />
    </div>
  )
}
