import { TabContentSkeleton } from '@/components/patterns/detail/tab-content-skeleton'

/**
 * Scoped to this route. Held at the segment above, this fallback was also the
 * boundary over every sibling that ships its own shaped skeleton, so one
 * navigation painted neutral filler and then the real thing.
 */
export default function Loading() {
  return <TabContentSkeleton />
}
