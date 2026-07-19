import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Building2, CreditCard, Mail, ShieldCheck } from '@876/ui/icons'
import { Avatar, AvatarFallback, AvatarImage } from '@876/ui/avatar'

import { MetricCard } from '@/components/metric-card'
import {
  DetailAccordion,
  DetailAccordionCard,
  Fact,
  FactGrid,
} from '@/components/detail-accordion'
import { resolveCustomer } from '@/app/(app)/detail-data'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { formatDate } from '@/lib/format'
import { resolveCustomerParty, type PrimaryContact } from './_data'

interface Props {
  params: Promise<{ customerId: string }>
}

export const metadata: Metadata = {
  title: 'Customer details',
  description: 'Customer billing activity and subscriptions.',
}

const SOURCE_LABEL: Record<PrimaryContact['source'], string> = {
  'org-owner': 'Organization owner',
  'org-member': 'Organization member',
  user: '876 user',
  self: 'Customer',
}

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?'
  )
}

export default async function CustomerDetailPage({ params }: Props) {
  const { customerId } = await params
  const context = await getWorkspaceContext()
  if (!context) return null

  const customer = await resolveCustomer(context.tenant.id, customerId)
  if (!customer) notFound()

  const party = await resolveCustomerParty(customer)
  const contact = party.contact
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
          <DetailAccordionCard title="Contact" icon={Mail} tone="sky">
            {!contact ? (
              <p className="text-muted-foreground py-2 text-sm">
                No contact details.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="size-10 text-sm">
                    {contact.avatar ? (
                      <AvatarImage src={contact.avatar} alt="" />
                    ) : null}
                    <AvatarFallback>{initialsOf(contact.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {contact.name}
                    </p>
                    <p className="text-muted-foreground flex items-center gap-1 truncate text-xs">
                      {contact.role ? (
                        <>
                          <ShieldCheck className="size-3 shrink-0" />
                          {contact.role}
                          <span aria-hidden="true">·</span>
                        </>
                      ) : null}
                      {SOURCE_LABEL[contact.source]}
                    </p>
                  </div>
                </div>
                <FactGrid>
                  <Fact label="Email" value={contact.email || '—'} />
                  <Fact label="Phone" value={contact.phone || '—'} />
                </FactGrid>
              </div>
            )}
          </DetailAccordionCard>

          <DetailAccordionCard title="Billing" icon={CreditCard} tone="violet">
            <FactGrid>
              <Fact
                label="Type"
                value={formatCustomerType(customer.customerType)}
              />
              <Fact label="Currency" value={currency} />
              <Fact label="Reference" value={reference} mono />
              <Fact
                label="Customer number"
                value={customer.customerNumber || '—'}
                mono
              />
              <Fact label="Website" value={customer.website || '—'} />
              <Fact
                label="Tax registration number"
                value={customer.taxRegistrationNumber || '—'}
                mono
              />
              <Fact label="Notes" value={customer.notes || '—'} />
              <Fact label="Added" value={formatDate(customer.createdAt)} />
            </FactGrid>
          </DetailAccordionCard>

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

function formatCustomerType(type: string): string {
  switch (type) {
    case 'CORE_ORGANIZATION':
      return '876 organization'
    case 'CORE_USER':
      return '876 user'
    default:
      return 'External customer'
  }
}
