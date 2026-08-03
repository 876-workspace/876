import { Skeleton } from '@876/ui/skeleton'

export default function Loading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-24 w-full" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-44" />
        <Skeleton className="h-44" />
        <Skeleton className="h-44" />
      </div>
    </div>
  )
}
