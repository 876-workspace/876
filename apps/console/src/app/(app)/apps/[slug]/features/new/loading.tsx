import { TabContentSkeleton } from '@/components/patterns/detail/tab-content-skeleton'

/**
 * Scoped to this route. Held at the segment above, this fallback also covered
 * the sibling route group and the detail layout, which now streams on its own.
 */
export default function Loading() {
  return <TabContentSkeleton />
}
