import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
} from '@876/ui/detail-card'

import { requireAppPermission } from '@/lib/auth/guards'

import { RequestComposerClient } from '../_components/request-composer-client'

export const metadata = { title: 'New request' }

export default async function NewCustomerRequestPage({
  params,
}: {
  params: Promise<{ customerId: string }>
}) {
  await requireAppPermission('requests.create')
  const { customerId } = await params
  const baseHref = `/customers/${encodeURIComponent(customerId)}/requests`
  return (
    <DetailCard aria-label="New request">
      <DetailCardHeader title="New request" closeHref={baseHref} />
      <DetailCardBody>
        <RequestComposerClient customerId={customerId} baseHref={baseHref} />
      </DetailCardBody>
    </DetailCard>
  )
}
