import { Skeleton } from '@876/ui/skeleton'

export default function Loading() {
  return (
    <div>
      <Skeleton className="mb-5 h-8 w-28" />
      <div className="space-y-5">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    </div>
  )
}
