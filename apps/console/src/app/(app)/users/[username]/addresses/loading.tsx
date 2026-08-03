import { Skeleton } from '@876/ui/skeleton'

export default function Loading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-9 w-32" />
      <Skeleton className="h-96 w-full" />
    </div>
  )
}
