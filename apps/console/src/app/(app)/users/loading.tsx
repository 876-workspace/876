import { DetailHeaderSkeleton } from '@/components/patterns/detail/detail-header-skeleton'

/**
 * Fallback for everything under `/users` except the list, which has its own in
 * `(list)/loading.tsx`.
 *
 * A detail layout that awaits its entity suspends into the *parent* segment's
 * boundary — its own `loading.tsx` only wraps its children. Before the list was
 * moved into `(list)`, that parent boundary was the users table skeleton, so
 * clicking a row blanked the table and re-rendered the list before the user
 * appeared. This is detail-shaped instead.
 */
export default function Loading() {
  return <DetailHeaderSkeleton shape="circle" tabCount={7} />
}
