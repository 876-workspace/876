import { notFound, redirect } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import {
  DetailCard,
  DetailCardBody,
  DetailCardFact,
  DetailCardFacts,
  DetailCardHeader,
  DetailCardHeadline,
  DetailCardIcon,
  DetailCardIdBar,
  DetailCardSection,
} from '@876/ui/detail-card'
import { CreditCardIcon } from '@876/ui/icons'
import { WorkWidgetContextSetter } from '@876/widgets/react'

import { getInvoiceContext } from '@/lib/auth/context'
import { canAccess } from '@/lib/auth/access-context'
import { requireAppPermission } from '@/lib/auth/guards'
import { createInvoiceWorkContext } from '@/lib/auth/work-widget-context'
import { getBilling } from '@/lib/services/billing'
import { formatDate, formatMoney } from '@/lib/format'
import { documentStatusVariant } from '@/lib/status'

import { InvoiceActions } from './_components/invoice-actions'
import type { InvoiceStatus } from './_lib/invoice-editability'

type Props = { params: Promise<{ invoiceId: string }> }

export const metadata = {
  title: 'Invoice',
  description: 'Invoice details.',
}

export default async function InvoiceDetailPage({ params }: Props) {
  const { invoiceId } = await params
  const access = await requireAppPermission('invoices.view')
  const context = await getInvoiceContext()
  if (!context) redirect('/no-access')

  const billing = await getBilling(context.orgId)
  const result = await billing.invoices.retrieve(invoiceId)
  if (result.error?.code === 'invoice/not-found') notFound()
  if (result.error) {
    return (
      <DetailCard aria-label="Invoice unavailable">
        <DetailCardBody>
          <p className="text-muted-foreground text-sm">
            Invoice details are unavailable right now.
          </p>
        </DetailCardBody>
      </DetailCard>
    )
  }

  const invoice = result.data
  const canWrite = canAccess(access, 'invoices.write')
  const canRecordPayment = canAccess(access, 'payments.create')

  const customer =
    invoice.customer &&
    typeof invoice.customer === 'object' &&
    'name' in invoice.customer
      ? String(invoice.customer.name ?? '—')
      : String(invoice.customerName ?? '—')
  const customerId = String(invoice.customerId ?? '')
  const number = String(invoice.number ?? invoice.id)
  const totalAmount = String(invoice.totalAmount ?? '0')
  const amountDue = String(invoice.amountDue ?? invoice.totalAmount ?? '0')
  const currency = String(invoice.currency ?? 'JMD')
  const status = String(invoice.status ?? 'DRAFT') as InvoiceStatus
  const date =
    typeof invoice.issueAt === 'number'
      ? invoice.issueAt
      : typeof invoice.createdAt === 'number'
        ? invoice.createdAt
        : null

  return (
    <>
      <WorkWidgetContextSetter context={createInvoiceWorkContext(invoice)} />
      <DetailCard aria-label={`Invoice details: ${number}`}>
        <DetailCardHeader
          icon={
            <DetailCardIcon>
              <CreditCardIcon className="size-5" />
            </DetailCardIcon>
          }
          title={number}
          meta={
            <Badge variant={documentStatusVariant(status)}>
              {status.toLowerCase().replace(/_/g, ' ')}
            </Badge>
          }
          subtitle={customer}
          closeHref="/invoices"
          closeLabel="Close invoice details"
        />
        <div className="px-5 pt-5 sm:px-6 print:hidden">
          <InvoiceActions
            invoiceId={invoice.id}
            customerId={customerId}
            status={status}
            canWrite={canWrite}
            canRecordPayment={canRecordPayment}
          />
        </div>
        <DetailCardBody className="space-y-8">
          <DetailCardHeadline
            value={formatMoney(totalAmount, currency)}
            caption="Invoice total"
          />
          <DetailCardSection title="Invoice">
            <DetailCardFacts>
              <DetailCardFact label="Customer" value={customer} />
              <DetailCardFact label="Date" value={formatDate(date)} />
              <DetailCardFact
                label="Amount due"
                value={formatMoney(amountDue, currency)}
                mono
              />
              <DetailCardFact label="Currency" value={currency} mono />
            </DetailCardFacts>
          </DetailCardSection>
        </DetailCardBody>
        <DetailCardIdBar>
          <span className="truncate">{invoice.id}</span>
        </DetailCardIdBar>
      </DetailCard>
    </>
  )
}
