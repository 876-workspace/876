import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import { CustomerAvatar } from '@876/ui/customer-avatar'
import {
  DetailCard,
  DetailCardBody,
  DetailCardFact,
  DetailCardFacts,
  DetailCardHeader,
  DetailCardHeadline,
  DetailCardIdBar,
  DetailCardMeta,
  DetailCardMetaItem,
  DetailCardSection,
} from '@876/ui/detail-card'
import { Mail, Phone } from '@876/ui/icons'

import { getInvoice } from '@/lib/invoice'
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
  const invoice = await getInvoice()
  if (!invoice) redirect('/no-access')

  const result = await invoice.customers.retrieve(customerId)

  if (result.error) {
    if (result.error.code.endsWith('/not-found')) notFound()
    return (
      <DetailCard aria-label="Customer unavailable">
        <DetailCardBody>
          <div className="rounded-lg border border-dashed p-10 text-center">
            <p className="text-sm font-medium">Customer unavailable</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Please try again shortly.
            </p>
          </div>
        </DetailCardBody>
      </DetailCard>
    )
  }

  const customer = result.data
  const primary = customer.primaryContact
  const contactName = primary
    ? [primary.firstName, primary.lastName].filter(Boolean).join(' ').trim() ||
      null
    : null
  const currency = customer.defaultCurrency ?? 'JMD'
  const canManage = invoice.role !== 'staff'

  return (
    <DetailCard aria-label={`Customer details: ${customer.name}`}>
      <DetailCardHeader
        icon={<CustomerAvatar name={customer.name} size="lg" />}
        title={customer.name}
        meta={
          <Badge
            variant={customer.status === 'ACTIVE' ? 'success' : 'secondary'}
          >
            {customer.status === 'ACTIVE' ? 'Active' : 'Archived'}
          </Badge>
        }
        subtitle={
          <DetailCardMeta>
            {customer.companyName ? (
              <span className="text-foreground/80 font-medium">
                {customer.companyName}
              </span>
            ) : null}
            {customer.email ? (
              <DetailCardMetaItem
                icon={<Mail />}
                href={`mailto:${customer.email}`}
              >
                {customer.email}
              </DetailCardMetaItem>
            ) : null}
            {customer.phone ? (
              <DetailCardMetaItem
                icon={<Phone />}
                href={`tel:${customer.phone}`}
              >
                {customer.phone}
              </DetailCardMetaItem>
            ) : null}
          </DetailCardMeta>
        }
        actions={
          <CustomerActions
            customerId={customer.id}
            customerName={customer.name}
            canManage={canManage}
          />
        }
        closeHref="/customers"
        closeLabel="Close customer details"
      />

      <DetailCardBody className="space-y-8">
        <DetailCardHeadline
          value={formatMoney(customer.outstandingReceivable, currency)}
          caption={`Outstanding receivable · ${formatMoney(
            customer.unusedCredits,
            currency
          )} unused credits`}
        />

        <DetailCardSection title="Contact">
          <DetailCardFacts>
            <DetailCardFact label="Email" value={customer.email ?? '—'} />
            <DetailCardFact label="Phone" value={customer.phone ?? '—'} />
            <DetailCardFact
              label="Work phone"
              value={customer.workPhone ?? '—'}
            />
            <DetailCardFact
              label="Company"
              value={customer.companyName ?? '—'}
            />
          </DetailCardFacts>
        </DetailCardSection>

        {primary ? (
          <DetailCardSection title="Primary contact">
            <DetailCardFacts>
              <DetailCardFact label="Name" value={contactName ?? '—'} />
              <DetailCardFact label="Email" value={primary.email ?? '—'} />
              <DetailCardFact
                label="Phone"
                value={primary.workPhone ?? primary.mobilePhone ?? '—'}
              />
            </DetailCardFacts>
          </DetailCardSection>
        ) : null}

        <DetailCardSection title="Billing">
          <DetailCardFacts>
            <DetailCardFact label="Currency" value={currency} mono />
            <DetailCardFact
              label="Outstanding receivable"
              value={formatMoney(customer.outstandingReceivable, currency)}
              mono
            />
            <DetailCardFact
              label="Unused credits"
              value={formatMoney(customer.unusedCredits, currency)}
              mono
            />
          </DetailCardFacts>
        </DetailCardSection>
      </DetailCardBody>

      <DetailCardIdBar>
        <span className="truncate">{customer.id}</span>
      </DetailCardIdBar>
    </DetailCard>
  )
}
