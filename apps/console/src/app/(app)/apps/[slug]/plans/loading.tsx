import { TabContentSkeleton } from '@/components/patterns/detail/tab-content-skeleton'

/**
 * Fallback for the routes below this segment. The page itself keeps its own
 * shaped skeleton inside its route group — left here, it would be the nearest
 * boundary above every child layout and would replay this page on the way in.
 */
export default function Loading() {
  return <TabContentSkeleton />
}
