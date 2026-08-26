import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { Suspense } from 'react'

import { $876 } from '@/lib/876'
import { requireCrmContext } from '@/lib/auth/require-crm-context'

import { REQUESTS_SKELETON_COLUMNS } from './_components/requests-skeleton-columns'
import { RequestsTable, type CrmRequestRow } from './_components/requests-table'

export const metadata = { title: 'Requests' }

export default function RequestsPage() {
  return (
    <Page>
      <ResourceToolbar
        title="Requests"
        primaryLabel="Add"
        primaryHref="/requests/new"
        primaryVariant="info"
        refresh
      />

      <Suspense
        fallback={<DataTableSkeleton columns={REQUESTS_SKELETON_COLUMNS} />}
      >
        <RequestsTableData />
      </Suspense>
    </Page>
  )
}

async function RequestsTableData() {
  const context = await requireCrmContext()
  const [requestsResult, customersResult] = await Promise.all([
    $876.requests.list(context.orgId),
    $876.customerProfiles.list(context.orgId),
  ])
  if (requestsResult.error) throw new Error(requestsResult.error.message)
  if (customersResult.error) throw new Error(customersResult.error.message)

  const customerNames = new Map(
    customersResult.data.data.map(({ profile, customer }) => [
      profile.id,
      customer?.name ?? profile.billingCustomerId,
    ])
  )

  const rows: CrmRequestRow[] = requestsResult.data.data.map((request) => ({
    id: request.id,
    number: request.number,
    subject: request.subject,
    customerId: request.customerId,
    customerName: customerNames.get(request.customerId) ?? request.customerId,
    category: request.category,
    status: request.status,
    priority: request.priority,
    source: request.source,
    createdAt: request.createdAt,
  }))

  return <RequestsTable requests={rows} />
}
