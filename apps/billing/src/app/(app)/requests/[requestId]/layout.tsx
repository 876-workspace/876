import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'

import { RequestRecordClient } from '@/features/crm/request-record-client'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { getCrm } from '@/lib/services/crm'

export default async function RequestLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ requestId: string }>
}) {
  const [{ requestId }, context] = await Promise.all([
    params,
    getWorkspaceContext(),
  ])
  if (!context) notFound()

  const crm = getCrm()
  const result = await crm.requests.retrieve(context.orgId, requestId)
  if (!result.data) notFound()

  const customer = await crm.customers.retrieve(
    context.orgId,
    result.data.customerId
  )
  const customerHref = customer.data
    ? `/customers/${encodeURIComponent(customer.data.profile.billingCustomerId)}`
    : undefined
  const baseHref = `/requests/${encodeURIComponent(requestId)}`

  return (
    <RequestRecordClient
      value={result.data}
      baseHref={baseHref}
      closeHref="/requests"
      customerHref={customerHref}
    >
      {children}
    </RequestRecordClient>
  )
}
