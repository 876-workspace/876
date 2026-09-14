import { notFound } from 'next/navigation'

import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
} from '@876/ui/detail-card'

import { CustomerRequestComposerClient } from '../_components/request-composer-client'
import { getManageContext } from '@/lib/auth/manage-context'
import { resolveCustomer } from '../../../_lib/customer-data'

export const metadata = { title: 'New request' }

export default async function NewCustomerRequestPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>
}) {
  const { orgSlug, id } = await params
  const [context, customer] = await Promise.all([
    getManageContext(orgSlug),
    resolveCustomer(orgSlug, id),
  ])
  if (!context || !customer) notFound()

  const baseHref = `/${orgSlug}/customers/${encodeURIComponent(id)}/requests`

  return (
    <DetailCard aria-label="New request">
      <DetailCardHeader title="New request" closeHref={baseHref} />
      <DetailCardBody>
        <CustomerRequestComposerClient
          orgSlug={orgSlug}
          customerId={customer.profile.billingCustomerId}
          baseHref={baseHref}
        />
      </DetailCardBody>
    </DetailCard>
  )
}
