import Link from 'next/link'
import { notFound } from 'next/navigation'

import { buttonVariants } from '@876/ui/button'
import { Page, PageBreadcrumb } from '@876/ui/page'

import { $876 } from '@/lib/876'
import { requireCrmContext } from '@/lib/auth/require-crm-context'

import { DeleteRequestButton } from '../_components/delete-request-button'

type Props = { params: Promise<{ requestId: string }> }

export default async function RequestPage({ params }: Props) {
  const context = await requireCrmContext()
  const { requestId } = await params
  const result = await $876.requests.retrieve(context.orgId, requestId)
  if (result.error?.code === 'crm/request-not-found') notFound()
  if (result.error) throw new Error(result.error.message)

  const request = result.data
  const customerResult = await $876.customerProfiles.retrieve(context.orgId, request.customerId)
  const customerName = customerResult.data?.customer?.name ?? request.customerId

  return (
    <Page>
      <PageBreadcrumb href="/requests" label="Requests" className="mb-4" />
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">Request #{request.number}</p>
          <h1 className="876-page-title">{request.subject}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{customerName}</p>
        </div>
        <Link href={`/requests/${request.id}/edit`} className={buttonVariants({ variant: 'outline' })}>Edit</Link>
      </div>

      <dl className="grid max-w-3xl gap-4 rounded-xl border p-5 sm:grid-cols-2">
        <Detail label="Status" value={request.status.replaceAll('_', ' ')} />
        <Detail label="Priority" value={request.priority} />
        <Detail label="Category" value={request.category} />
        <Detail label="Source" value={request.source} />
        <Detail label="Assignee ID" value={request.assigneeId ?? '—'} />
        <Detail label="Created by" value={request.createdBy} />
      </dl>

      {request.description ? (
        <section className="mt-6 max-w-3xl rounded-xl border p-5">
          <h2 className="font-medium">Description</h2>
          <p className="text-muted-foreground mt-2 whitespace-pre-wrap text-sm">{request.description}</p>
        </section>
      ) : null}

      <div className="mt-8 border-t pt-6"><DeleteRequestButton requestId={request.id} /></div>
    </Page>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs tracking-wide uppercase">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  )
}
