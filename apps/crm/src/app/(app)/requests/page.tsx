import Link from 'next/link'

import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@876/ui/empty'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'

import { $876 } from '@/lib/876'
import { requireCrmContext } from '@/lib/auth/require-crm-context'

export const metadata = { title: 'Requests' }

export default async function RequestsPage() {
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
  const requests = requestsResult.data.data

  return (
    <Page>
      <ResourceToolbar title="Requests" primaryLabel="Add" primaryHref="/requests/new" primaryVariant="info" />

      {requests.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No requests yet</EmptyTitle>
            <EmptyDescription>Create a request to track customer support, billing, sales, complaints, feedback, and other relationship work.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Request</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Priority</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id} className="border-t">
                  <td className="px-4 py-3">
                    <Link href={`/requests/${request.id}`} className="font-medium hover:underline">
                      #{request.number} · {request.subject}
                    </Link>
                  </td>
                  <td className="text-muted-foreground px-4 py-3">{customerNames.get(request.customerId) ?? request.customerId}</td>
                  <td className="px-4 py-3">{request.status.replaceAll('_', ' ')}</td>
                  <td className="px-4 py-3">{request.priority}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Page>
  )
}
