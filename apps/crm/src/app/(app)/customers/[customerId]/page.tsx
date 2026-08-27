import Link from 'next/link'
import { notFound } from 'next/navigation'

import { buttonVariants } from '@876/ui/button'
import { Page, PageBreadcrumb } from '@876/ui/page'

import { get876Client } from '@/lib/876'
import { requireCrmContext } from '@/lib/auth/require-crm-context'

import { resolveCustomerIdentity } from '@/features/customers/customer-identity'

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
  const identity = resolveCustomerIdentity(customer, profile.billingCustomerId)

  return (
    <Page>
      <PageBreadcrumb href="/customers" label="Customers" className="mb-4" />
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="876-page-title">{identity.name}</h1>
          {/*
            The subtitle is about the *party*, not the person. It used to print
            `customer.email`, which on a business customer is the owner's
            personal address — the organization reading as if it were a human.
          */}
          <p className="text-muted-foreground mt-1 text-sm">
            {identity.legalName ?? identity.typeLabel}
          </p>
        </div>
        <Link
          href={`/customers/${profile.id}/edit`}
          className={buttonVariants({ variant: 'outline' })}
        >
          Edit
        </Link>
      </div>

      {/*
        876 has organizations and it has customers. For a business customer the
        two are the same party, and the person you actually contact is separate
        — so the organization's own details and its primary contact's get their
        own cards rather than one merged block that blurs whose email is whose.
      */}
      <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
        <PartyCard
          title={identity.isBusiness ? 'Organization' : 'Customer'}
          name={identity.name}
          rows={[
            ...(identity.legalName
              ? [{ label: 'Legal name', value: identity.legalName }]
              : []),
            { label: 'Email', value: identity.email },
            { label: 'Phone', value: identity.phone },
            {
              label: 'Type',
              value: identity.isBusiness ? 'Business' : 'Individual',
            },
            { label: 'Source', value: identity.typeLabel },
          ]}
        />

        {identity.isBusiness ? (
          <PartyCard
            title="Primary contact"
            name={identity.contact?.name ?? null}
            empty="No contact on file"
            rows={[
              { label: 'Email', value: identity.contact?.email ?? null },
              { label: 'Phone', value: identity.contact?.phone ?? null },
              {
                label: '876 account',
                value: identity.contact?.userId ?? null,
              },
            ]}
          />
        ) : null}

        <PartyCard
          title="CRM record"
          rows={[
            { label: 'Registry ID', value: profile.billingCustomerId },
            {
              label: 'CRM status',
              value: profile.status === 'ACTIVE' ? 'Active' : 'Inactive',
            },
            { label: 'Owner ID', value: profile.ownerId },
          ]}
        />
      </div>

      <div className="mt-8 border-t pt-6">
        <DeleteCustomerButton customerId={profile.id} />
      </div>
    </Page>
  )
}

/** One party — its name, then its own facts. Never another party's. */
function PartyCard({
  title,
  name,
  empty,
  rows,
}: {
  title: string
  name?: string | null
  empty?: string
  rows: { label: string; value: string | null }[]
}) {
  return (
    <section className="rounded-xl border p-5">
      <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {title}
      </h2>
      {name !== undefined ? (
        <p className="mt-1.5 text-sm font-medium">
          {name ?? (
            <span className="text-muted-foreground font-normal">
              {empty ?? '—'}
            </span>
          )}
        </p>
      ) : null}
      <dl className="mt-3 space-y-2.5">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-muted-foreground text-xs">{row.label}</dt>
            <dd className="mt-0.5 text-sm">
              {row.value ?? <span className="text-muted-foreground">—</span>}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
