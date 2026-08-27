import Link from 'next/link'
import { notFound } from 'next/navigation'

import { buttonVariants } from '@876/ui/button'
import { Page, PageBreadcrumb } from '@876/ui/page'

import { get876Client } from '@/lib/876'
import { requireCrmContext } from '@/lib/auth/require-crm-context'

import { DeleteCustomerButton } from '../_components/delete-customer-button'

type Props = { params: Promise<{ customerId: string }> }

export default async function CustomerPage({ params }: Props) {
  const context = await requireCrmContext()
  const $876 = await get876Client()
  const { customerId } = await params
  const result = await $876.customerProfiles.retrieve(context.orgId, customerId)
  if (result.error?.code === 'crm/customer-not-found') notFound()
  if (result.error) throw new Error(result.error.message)

  const { profile, customer } = result.data

  return (
    <Page>
      <PageBreadcrumb href="/customers" label="Customers" className="mb-4" />
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="876-page-title">
            {customer?.name ?? profile.billingCustomerId}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {customer?.email ?? 'No email address'}
          </p>
        </div>
        <Link
          href={`/customers/${profile.id}/edit`}
          className={buttonVariants({ variant: 'outline' })}
        >
          Edit
        </Link>
      </div>

      <dl className="grid max-w-3xl gap-4 rounded-xl border p-5 sm:grid-cols-2">
        <Detail label="Registry ID" value={profile.billingCustomerId} />
        <Detail
          label="CRM status"
          value={profile.status === 'ACTIVE' ? 'Active' : 'Inactive'}
        />
        <Detail
          label="Type"
          value={
            customer?.customerKind === 'BUSINESS' ? 'Business' : 'Individual'
          }
        />
        <Detail label="Source" value={customer?.customerType ?? 'Unknown'} />
        <Detail label="Phone" value={customer?.phone ?? '—'} />
        <Detail label="Owner ID" value={profile.ownerId ?? '—'} />
      </dl>

      <div className="mt-8 border-t pt-6">
        <DeleteCustomerButton customerId={profile.id} />
      </div>
    </Page>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs tracking-wide uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  )
}
