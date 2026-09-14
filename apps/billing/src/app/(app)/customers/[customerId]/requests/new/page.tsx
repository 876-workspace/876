import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
} from '@876/ui/detail-card'

import { RequestComposerClient } from '@/features/crm/request-composer-client'
import { requirePagePermission } from '@/lib/auth/billing-context'

export const metadata = { title: 'New request' }

export default async function NewCustomerRequestPage({
  params,
}: {
  params: Promise<{ customerId: string }>
}) {
  await requirePagePermission('customers:write')
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
