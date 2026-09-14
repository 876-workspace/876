import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { getManageContext } from '@/lib/auth/manage-context'
import { crm } from '@/lib/services/crm'

import { RequestRecordClient } from '../_components/request-record-client'

export default async function RequestLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ orgSlug: string; requestId: string }>
}) {
  const { orgSlug, requestId } = await params
  const context = await getManageContext(orgSlug)
  if (!context) notFound()

  const result = await crm.requests.retrieve(context.orgId, requestId)
  if (!result.data) notFound()

  return (
    <RequestRecordClient
      orgSlug={orgSlug}
      request={result.data}
      baseHref={`/${orgSlug}/requests/${encodeURIComponent(requestId)}`}
      closeHref={`/${orgSlug}/requests`}
    >
      {children}
    </RequestRecordClient>
  )
}
