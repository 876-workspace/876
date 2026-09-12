import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'

import {
  getWorkspaceContext,
  requirePagePermission,
} from '@/lib/auth/billing-context'
import { getCrm } from '@/lib/services/crm'

import { RequestRecordClient } from '../_components/request-record-client'

export default async function CustomerRequestLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ customerId: string; requestId: string }>
}) {
  await requirePagePermission('customers:read')
  const { customerId, requestId } = await params
  const context = await getWorkspaceContext()
  if (!context) notFound()
  const result = await getCrm().requests.retrieve(context.orgId, requestId)
  if (!result.data) notFound()
  const baseHref = `/customers/${encodeURIComponent(customerId)}/requests/${encodeURIComponent(requestId)}`
  return (
    <RequestRecordClient value={result.data} baseHref={baseHref}>
      {children}
    </RequestRecordClient>
  )
}
