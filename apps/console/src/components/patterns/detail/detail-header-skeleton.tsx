import { Skeleton } from '@876/ui/skeleton'
import { cn } from '@876/core/utils'

/**
 * The detail-page identity band, in skeleton form.
 *
 * It exists because a `loading.tsx` at a list segment is the nearest Suspense
 * boundary above a *detail* segment's layout — a detail layout that awaits its
 * entity suspends into the list's fallback, so clicking a row would blank the
 * table and re-render the list skeleton before the detail appeared.
 *
 * Scoping the list's own fallback to the list fixes that half; this is the other
 * half. It mirrors `DetailHeader`'s spacing exactly so the band does not shift
 * when the real header streams in.
 *
 * `shape` follows the entity: a person is a circle, an organization or an app is
 * a rounded rectangle. Getting that wrong is the most visible jump of all.
 */
export function DetailHeaderSkeleton({
  shape = 'circle',
  tabCount = 5,
}: {
  shape?: 'circle' | 'square'
  tabCount?: number
}) {
  return (
    <div className="876-detail-header-shell">
      <div className="px-4 pt-4 pb-3 sm:px-6 sm:pt-5 sm:pb-4 lg:px-8">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Skeleton
              className={cn(
                'size-[4.5rem] shrink-0 sm:size-20',
                shape === 'circle' ? 'rounded-full' : 'rounded-xl'
              )}
            />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-48 max-w-full" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </div>
          </div>

          <div className="flex shrink-0 gap-2 sm:pt-0.5">
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      </div>

      <div className="border-876-surface-border flex gap-5 border-b px-4 sm:px-6 lg:px-8">
        {Array.from({ length: tabCount }, (_, index) => (
          <Skeleton key={index} className="mb-2.5 h-4 w-16" />
        ))}
      </div>
    </div>
  )
}
