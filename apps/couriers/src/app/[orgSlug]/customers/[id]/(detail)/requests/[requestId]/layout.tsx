import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { getManageContext } from '@/lib/auth/manage-context'
import { crm } from '@/lib/services/crm'
import { resolveCustomer } from '../../../_lib/customer-data'

import { CustomerRequestRecordClient } from '../_components/request-record-client'

export default async function CustomerRequestLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ orgSlug: string; id: string; requestId: string }>
}) {
  const { orgSlug, id, requestId } = await params
  const [context, customer] = await Promise.all([
    getManageContext(orgSlug),
    resolveCustomer(orgSlug, id),
  ])
  if (!context || !customer) notFound()

  const linked = await crm.requests.listForBillingCustomer(
    context.orgId,
    customer.profile.billingCustomerId
  )
  if (
    linked.error ||
    !linked.data.data.some((request) => request.id === requestId)
  )
    notFound()

  const result = await crm.requests.retrieve(context.orgId, requestId)
  if (!result.data) notFound()

  const baseHref = `/${orgSlug}/customers/${encodeURIComponent(id)}/requests/${encodeURIComponent(requestId)}`
  const closeHref = `/${orgSlug}/customers/${encodeURIComponent(id)}/requests`

  return (
    <CustomerRequestRecordClient
      orgSlug={orgSlug}
      request={result.data}
      baseHref={baseHref}
      closeHref={closeHref}
    >
      {children}
    </CustomerRequestRecordClient>
  )
}
