import { Skeleton } from '@876/ui/skeleton'

/**
 * The complete route shell for the addresses tab.
 *
 * Shared by `loading.tsx` and the page's outermost Suspense fallback so the two
 * are the same element. If the outer fallback were body-only, the toolbar
 * placeholder `loading.tsx` had already painted would disappear the moment the
 * page took over, and the panel would jump upward mid-navigation.
 */
export function AddressesPageSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-9 w-32" />
      <Skeleton className="h-96 w-full" />
    </div>
  )
}
