import { Skeleton } from '@876/ui/skeleton'

export function CategoriesSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="876-card p-5">
          <div className="flex items-start gap-3">
            <Skeleton className="size-9 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="size-8 rounded-md" />
          </div>
          <div className="mt-4 space-y-2 border-t pt-3 pl-12">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
      ))}
    </div>
  )
}
