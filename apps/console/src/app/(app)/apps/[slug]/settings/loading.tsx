import { Skeleton } from '@876/ui/skeleton'

export default function Loading() {
  return (
    <div>
      <h1 className="876-page-title mb-5">Settings</h1>
      <div className="space-y-5">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    </div>
  )
}
