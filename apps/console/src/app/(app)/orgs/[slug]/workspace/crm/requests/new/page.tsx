import { PageBreadcrumb } from '@876/ui/page'
import { notFound } from 'next/navigation'

import { requireSession } from '@/lib/auth/guards'
import { RequestCreateForm } from '@/features/crm/components/request-create-form'
import {
  loadOrgPriorities,
  loadOrgRequestCustomers,
} from '@/features/crm/request-data'
import { resolveOrg } from '../../../../_data'

type Props = { params: Promise<{ slug: string }> }

export default async function NewRequestPage({ params }: Props) {
  const { slug } = await params
  const [org, session] = await Promise.all([
    resolveOrg(slug),
    requireSession(`/orgs/${slug}/workspace/crm/requests/new`),
  ])
  if (!org) notFound()
  const [customers, priorities] = await Promise.all([
    loadOrgRequestCustomers(org.id),
    loadOrgPriorities(org.id),
  ])

  return (
    <div className="space-y-5">
      <div>
        <PageBreadcrumb
          href={`/orgs/${slug}/workspace/crm/requests`}
          label="Requests"
          className="mb-2"
        />
        <h1 className="876-page-title mt-2">New request</h1>
      </div>
      <RequestCreateForm
        organizationId={org.id}
        requestsHref={`/orgs/${slug}/workspace/crm/requests`}
        currentUserId={session.id}
        customers={customers}
        priorities={priorities}
      />
    </div>
  )
}
