import { Suspense } from 'react'

import { CustomerOverviewData } from './_components/customer-overview-data'
import { CustomerOverviewSkeleton } from './_components/customer-overview-skeleton'

type Props = { params: Promise<{ orgSlug: string; id: string }> }

/**
 * The detail layout can render its header immediately; keep this route itself
 * synchronous so the overview body streams independently beneath that chrome.
 */
export default function CustomerOverviewPage({ params }: Props) {
  return (
    <Suspense fallback={<CustomerOverviewSkeleton />}>
      <CustomerOverviewData params={params} />
    </Suspense>
  )
}
