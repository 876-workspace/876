import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Building2 } from '@876/ui/icons'

import { MetricCard } from '@/components/patterns/metric-card'
import {
  DetailAccordion,
  DetailAccordionCard,
  Fact,
  FactGrid,
} from '@/components/patterns/detail/detail-accordion'
import { resolveCustomer } from '@/app/(app)/_lib/detail-data'
import { getWorkspaceContext } from '@/lib/auth/billing-context'

import { resolveCustomerParty } from './_data'
import { CustomerContactCard } from './_components/customer-contact-card'
import { CustomerBillingCard } from './_components/customer-billing-card'

interface Props {
  params: Promise<{ customerId: string }>
}

export const metadata: Metadata = {
  title: 'Customer details',
  description: 'Customer billing activity and subscriptions.',
}

export default async function CustomerDetailPage({ params }: Props) {
  const { customerId } = await params
  const context = await getWorkspaceContext()
  if (!context) return null

  const customer = await resolveCustomer(context.tenant.id, customerId)
  if (!customer) notFound()

  const party = await resolveCustomerParty(customer)
  const currency = (
    customer.defaultCurrency ?? context.tenant.defaultCurrency
  ).toUpperCase()
  const reference =
    customer.organizationId ??
    customer.userId ??
    customer.externalReference ??
    '—'

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,32%)_1fr]">
      <div className="min-w-0">
        <DetailAccordion defaultOpen="contact">
          <CustomerContactCard contact={party.contact} />

          <CustomerBillingCard
            customerType={customer.customerType}
            currency={currency}
            reference={reference}
            createdAt={customer.createdAt}
          />

          {party.org ? (
            <DetailAccordionCard
              title="Organization"
              icon={Building2}
              tone="blue"
            >
              <FactGrid>
                <Fact label="Name" value={party.org.name || '—'} />
                <Fact label="Slug" value={party.org.slug} mono />
                <Fact label="Members" value={party.memberCount ?? '—'} />
                <Fact
                  label="Status"
                  value={<span className="capitalize">{party.org.status}</span>}
                />
              </FactGrid>
            </DetailAccordionCard>
          ) : null}
        </DetailAccordion>
      </div>

      <div className="min-w-0 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            label="Subscriptions"
            value={customer._count.subscriptions}
            detail="Commercial agreements"
          />
          <MetricCard
            label="Invoices"
            value={customer._count.invoices}
            detail="Billing documents"
          />
          <MetricCard
            label="Quotes"
            value={customer._count.quotes}
            detail="Prepared proposals"
          />
        </div>

        <div className="876-card flex min-h-40 flex-col items-center justify-center border-dashed p-6 text-center">
          <p className="text-muted-foreground text-sm font-medium">Reserved</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Recent transactions and statements for this customer will appear
            here.
          </p>
        </div>
      </div>
    </div>
  )
}
