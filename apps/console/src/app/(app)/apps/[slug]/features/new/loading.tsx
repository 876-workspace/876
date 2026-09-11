import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
} from '@876/ui/detail-card'

import { TabContentSkeleton } from '@/components/patterns/detail/tab-content-skeleton'

/**
 * The form opens in the detail column, so its fallback is the same card: the
 * list beside it stays put and only the form body shimmers.
 */
export default function Loading() {
  return (
    <DetailCard aria-label="New Feature">
      <DetailCardHeader title="New Feature" />
      <DetailCardBody>
        <TabContentSkeleton />
      </DetailCardBody>
    </DetailCard>
  )
}
