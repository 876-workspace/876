import { TabContentSkeleton } from '@/components/patterns/detail/tab-content-skeleton'

/**
 * Scoped to this route. Held at the segment above, this fallback was also the
 * boundary over siblings that ship their own shaped skeleton, so a single
 * navigation painted neutral filler and then the real one.
 */
export default function Loading() {
  return <TabContentSkeleton />
}
