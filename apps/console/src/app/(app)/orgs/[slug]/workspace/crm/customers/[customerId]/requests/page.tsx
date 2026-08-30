import { AppError } from '@876/ui/app-error'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { RequestsList } from '@/features/crm/components/requests-list'
import { loadRequestRowContext } from '@/features/crm/request-data'
import { toRequestListRows } from '@/features/crm/request-list-rows'
import { workspaceBase } from '@/features/orgs/app-workspaces'
import { crm } from '@/lib/services/crm'

import { resolveOrg } from '../../../../../_data'

type Props = { params: Promise<{ slug: string; customerId: string }> }

export const metadata: Metadata = { title: 'Customer Requests - Organizations' }

export default async function CrmWorkspaceCustomerRequestsPage({ params }: Props) {
  const { slug, customerId } = await params
  const org = await resolveOrg(slug)
  if (!org) notFound()

  const result = await crm.requests.list(org.id, { customerId })
  if (result.error)
    return (
      <AppError
        title="Request history is temporarily unavailable"
        error={result.error}
        variant="banner"
        showCode
      />
    )

  const context = await loadRequestRowContext(org.id)
  const base = workspaceBase(slug, 'crm')

  return (
    <RequestsList
      requestsHref={`${base}/requests`}
      requests={toRequestListRows({ requests: result.data.data, ...context })}
    />
  )
}
