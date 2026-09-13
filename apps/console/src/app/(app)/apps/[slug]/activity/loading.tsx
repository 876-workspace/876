import { TabContentSkeleton } from '@/components/patterns/detail/tab-content-skeleton'

/**
 * Scoped to this tab rather than the `[slug]` segment. A fallback there is the
 * boundary above every sibling tab too, including the ones that ship a shaped
 * skeleton of their own — so it painted this neutral filler first and their
 * real skeleton second, on one navigation.
 */
export default function Loading() {
  return <TabContentSkeleton />
}
