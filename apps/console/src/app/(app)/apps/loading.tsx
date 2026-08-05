import { DetailHeaderSkeleton } from '@/components/patterns/detail/detail-header-skeleton'

/** Detail-shaped fallback for everything under `/apps` except the list. */
export default function Loading() {
  return <DetailHeaderSkeleton shape="square" tabCount={9} />
}
