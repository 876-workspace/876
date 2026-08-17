import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronRightIcon } from '@876/ui/icons'
import { Badge } from '@876/ui/badge'
import { Page, PageHeader, PageTitle } from '@876/ui/page'
import { CustomerAvatar } from '@876/ui/customer-avatar'

import { getInvoiceBillingIntegration } from '@/lib/876/billing-integration'
import { getInvoiceContext } from '@/lib/auth/context'
import { formatMoney } from '@/lib/format'
import { CustomerActions } from './_components/customer-actions'

interface Props {
  params: Promise<{ customerId: string }>
}

export const metadata: Metadata = {
  title: 'Customer',
  description: 'Customer details.',
}

export default async function CustomerDetailPage({ params }: Props) {
  const { customerId } = await params
  const context = await getInvoiceContext()
  if (!context) redirect('/no-access')

  const billing = await getInvoiceBillingIntegration()
  const result = await billing.customers.retrieve(context.orgId, customerId)

  if (result.error) {
    if (result.error.code.endsWith('/not-found')) notFound()
    return (
      <Page>
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm font-medium">Customer unavailable</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Please try again shortly.
          </p>
        </div>
      </Page>
    )
  }

  const customer = result.data
  const primary = customer.primaryContact
  const contactName = primary
    ? [primary.firstName, primary.lastName].filter(Boolean).join(' ').trim() ||
      null
    : null
  const currency = customer.defaultCurrency ?? 'JMD'
  const canManage = context.role !== 'member'

  return (
    <Page>
      <nav className="mb-5 flex items-center gap-1.5 text-sm">
        <Link
          href="/customers"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Customers
        </Link>
        <ChevronRightIcon className="text-muted-foreground size-4" />
        <span className="font-medium">{customer.name}</span>
      </nav>

      <PageHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4">
            <CustomerAvatar name={customer.name} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <PageTitle>{customer.name}</PageTitle>
                <Badge
                  variant={customer.status === 'ACTIVE' ? 'success' : 'secondary'}
                >
                  {customer.status === 'ACTIVE' ? 'Active' : 'Archived'}
                </Badge>
              </div>
            </div>
          </div>
          <CustomerActions
            customerId={customer.id}
            customerName={customer.name}
            canManage={canManage}
          />
        </div>
      </PageHeader>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="876-card divide-y">
          <div className="px-5 py-3">
            <span className="876-eyebrow">Contact</span>
          </div>
          <dl className="divide-y">
            <FactRow label="Email" value={customer.email ?? '—'} />
            <FactRow label="Phone" value={customer.phone ?? '—'} />
            <FactRow label="Work phone" value={customer.workPhone ?? '—'} />
            <FactRow label="Company" value={customer.companyName ?? '—'} />
          </dl>
        </div>

        <div className="space-y-6">
          {primary ? (
            <div className="876-card divide-y">
              <div className="px-5 py-3">
                <span className="876-eyebrow">Primary contact</span>
              </div>
              <dl className="divide-y">
                <FactRow label="Name" value={contactName ?? '—'} />
                <FactRow label="Email" value={primary.email ?? '—'} />
                <FactRow
                  label="Phone"
                  value={primary.workPhone ?? primary.mobilePhone ?? '—'}
                />
              </dl>
            </div>
          ) : null}

          <div className="876-card divide-y">
            <div className="px-5 py-3">
              <span className="876-eyebrow">Financials</span>
            </div>
            <dl className="divide-y">
              <FactRow
                label="Outstanding receivable"
                value={formatMoney(customer.outstandingReceivable, currency)}
                mono
              />
              <FactRow
                label="Unused credits"
                value={formatMoney(customer.unusedCredits, currency)}
                mono
              />
              <FactRow label="Currency" value={currency} mono />
            </dl>
          </div>
        </div>
      </div>
    </Page>
  )
}

function FactRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-2.5">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd
        className={['text-sm font-medium', mono ? 'tabular-nums' : ''].join(
          ' '
        )}
      >
        {value}
      </dd>
    </div>
  )
}
