import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import {
  CustomerBillingFactsPanel,
  CustomerBillingFactsPanelSkeleton,
} from '@876/billing-ui/panels/customer-billing-facts-panel'
import {
  CustomerContactPanel,
  CustomerContactPanelSkeleton,
} from '@876/billing-ui/panels/customer-contact-panel'
import {
  CustomerOrganizationPanel,
  CustomerOrganizationPanelSkeleton,
} from '@876/billing-ui/panels/customer-organization-panel'
import {
  CustomerReceivablesPanel,
  CustomerReceivablesPanelSkeleton,
} from '@876/billing-ui/panels/customer-receivables-panel'

import { resolveCustomer } from '@/app/(app)/_lib/detail-data'
import { MetricCard } from '@/components/patterns/metric-card'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { formatDate, formatMoney } from '@/lib/format'
import { service } from '@/lib/service'
import { resolveCustomerParty, type CustomerPartyInput } from './_data'

interface Props {
  params: Promise<{ customerId: string }>
}

export const metadata: Metadata = {
  title: 'Customer details',
  description: 'Customer billing activity and subscriptions.',
}

const sourceLabels = {
  'org-super-admin': 'Organization super admin',
  'org-member': 'Organization member',
  user: '876 user',
  self: 'Customer',
} as const

export default function CustomerDetailPage({ params }: Props) {
  return (
    <Suspense fallback={<CustomerOverviewSkeleton />}>
      <CustomerOverviewData params={params} />
    </Suspense>
  )
}

async function CustomerOverviewData({ params }: Props) {
  const { customerId } = await params
  const context = await getWorkspaceContext()
  if (!context) return null

  const customer = await resolveCustomer(context.tenant.id, customerId)
  if (!customer) notFound()

  const [party, account] = await Promise.all([
    resolveCustomerParty(customer as unknown as CustomerPartyInput),
    service.customers.account(context.tenant.id, customerId),
  ])
  const currency = (
    customer.defaultCurrency ?? context.tenant.defaultCurrency
  ).toUpperCase()
  const reference =
    customer.organizationId ??
    customer.userId ??
    customer.externalReference ??
    '—'
  const contact = party.contact

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,32%)_1fr]">
      <div className="min-w-0 space-y-6">
        <CustomerContactPanel
          state={
            contact
              ? {
                  status: 'ready',
                  data: { ...contact, sourceLabel: sourceLabels[contact.source] },
                }
              : { status: 'empty' }
          }
        />
        <CustomerBillingFactsPanel
          state={{
            status: 'ready',
            data: {
              type: formatCustomerType(customer.customerType),
              currency,
              reference,
              addedDate: formatDate(customer.createdAt),
            },
          }}
        />
        <CustomerOrganizationPanel
          state={
            party.org
              ? {
                  status: 'ready',
                  data: {
                    name: party.org.name || '—',
                    slug: party.org.slug,
                    members: String(party.memberCount ?? '—'),
                    status: party.org.status,
                  },
                }
              : { status: 'empty' }
          }
        />
      </div>
      <div className="min-w-0 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            label="Subscriptions"
            value={customer.counts?.subscriptions ?? 0}
            detail="Commercial agreements"
          />
          <MetricCard
            label="Invoices"
            value={customer.counts?.invoices ?? 0}
            detail="Billing documents"
          />
          <MetricCard
            label="Quotes"
            value={customer.counts?.quotes ?? 0}
            detail="Prepared proposals"
          />
        </div>
        <CustomerReceivablesPanel
          state={
            account
              ? {
                  status: 'ready',
                  data: {
                    outstanding: formatMoney(account.outstandingReceivable, currency),
                    overdue: '—',
                    paid: formatMoney(account.lifetimePaid, currency),
                    currency,
                  },
                }
              : { status: 'empty' }
          }
        />
      </div>
    </div>
  )
}

function CustomerOverviewSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,32%)_1fr]">
      <div className="space-y-6">
        <CustomerContactPanelSkeleton />
        <CustomerBillingFactsPanelSkeleton />
        <CustomerOrganizationPanelSkeleton />
      </div>
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard label="Subscriptions" value="—" detail="Commercial agreements" />
          <MetricCard label="Invoices" value="—" detail="Billing documents" />
          <MetricCard label="Quotes" value="—" detail="Prepared proposals" />
        </div>
        <CustomerReceivablesPanelSkeleton />
      </div>
    </div>
  )
}

function formatCustomerType(type: string) {
  if (type === 'CORE_ORGANIZATION') return '876 organization'
  if (type === 'CORE_USER') return '876 user'
  return 'External customer'
}
