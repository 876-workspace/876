import { Suspense } from 'react'

import { Skeleton } from '@876/ui/skeleton'

import { CustomerRequestsData } from './_components/customer-requests-data'

export const metadata = { title: 'Requests' }

export default function CustomerRequestsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>
}) {
  return (
    <Suspense fallback={<Skeleton className="h-56 w-full" />}>
      <CustomerRequestsData params={params} />
    </Suspense>
  )
}
