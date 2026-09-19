import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'

import { RequestRecordClient } from '@/features/crm/request-record-client'
import { getInvoiceContext } from '@/lib/auth/context'
import { requireAppPermission } from '@/lib/auth/guards'
import { getCrm } from '@/lib/clients/crm'

export default async function CustomerRequestLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ customerId: string; requestId: string }>
}) {
  await requireAppPermission('requests.view')
  const { customerId, requestId } = await params
  const context = await getInvoiceContext()
  if (!context) notFound()
  const result = await getCrm().requests.retrieve(context.orgId, requestId)
  if (!result.data) notFound()
  const customerBaseHref = `/customers/${encodeURIComponent(customerId)}`
  const baseHref = `${customerBaseHref}/requests/${encodeURIComponent(requestId)}`
  return (
    <RequestRecordClient
      value={result.data}
      baseHref={baseHref}
      closeHref={`${customerBaseHref}/requests`}
      customerHref={customerBaseHref}
    >
      {children}
    </RequestRecordClient>
  )
}
