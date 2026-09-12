import { Badge } from '@876/ui/badge'
import { buttonVariants } from '@876/ui/button'
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
import type { ReactNode } from 'react'

import { Link } from './link'

export interface PaymentDetailAllocation {
  id: string
  invoiceId: string
  invoiceNumber: string
  invoiceStatus: string
  amount: string
  href: string
}

export interface PaymentDetailRefund {
  id: string
  number: string
  amount: string
  date: string
  reason: string | null
}

export interface PaymentDetailView {
  id: string
  number: string
  status: string
  customerName: string
  paymentDate: string
  received: string
  allocated: string
  unapplied: string
  refunded: string
  bankCharges: string
  paymentMode: string
  depositAccount: string
  reference: string
  notes: string | null
  allocations: PaymentDetailAllocation[]
  refunds?: PaymentDetailRefund[]
}

export interface PaymentDetailCardProps {
  payment: PaymentDetailView
  closeHref: string
  editHref?: string
  refundHref?: string
  children?: ReactNode
}

/** Canonical payment-received detail presentation shared by Billing and Invoice. */
export function PaymentDetailCard({
  payment,
  closeHref,
  editHref,
  refundHref,
  children,
}: PaymentDetailCardProps) {
  const actions =
    editHref || refundHref ? (
      <div className="flex items-center gap-2">
        {refundHref ? (
          <Link
            href={refundHref}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Refund
          </Link>
        ) : null}
        {editHref ? (
          <Link
            href={editHref}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Edit
          </Link>
        ) : null}
      </div>
    ) : undefined

  return (
    <DetailCard aria-label={`Payment details: ${payment.number}`}>
      <DetailCardHeader
        icon={
          <DetailCardIcon>
            <CreditCardIcon className="size-5" />
          </DetailCardIcon>
        }
        title={payment.number}
        meta={
          <Badge
            variant={payment.status === 'SUCCEEDED' ? 'success' : 'secondary'}
          >
            {formatStatus(payment.status)}
          </Badge>
        }
        subtitle={`${payment.customerName} · ${payment.paymentDate}`}
        actions={actions}
        closeHref={closeHref}
        closeLabel="Close payment details"
      />
      <DetailCardBody className="space-y-8">
        <DetailCardHeadline
          value={payment.received}
          caption="Payment received"
        />
        <DetailCardSection title="Payment">
          <DetailCardFacts>
            <DetailCardFact label="Customer" value={payment.customerName} />
            <DetailCardFact label="Received" value={payment.paymentDate} />
            <DetailCardFact
              label="Deposit account"
              value={payment.depositAccount}
            />
            <DetailCardFact label="Payment mode" value={payment.paymentMode} />
            <DetailCardFact label="Allocated" value={payment.allocated} mono />
            <DetailCardFact label="Unapplied" value={payment.unapplied} mono />
            <DetailCardFact label="Refunded" value={payment.refunded} mono />
            <DetailCardFact
              label="Bank charges"
              value={payment.bankCharges}
              mono
            />
            <DetailCardFact label="Reference" value={payment.reference} mono />
          </DetailCardFacts>
        </DetailCardSection>

        {payment.allocations.length > 0 ? (
          <DetailCardSection title="Applied to invoices">
            <div className="divide-border divide-y rounded-lg border">
              {payment.allocations.map((allocation) => (
                <Link
                  key={allocation.id}
                  href={allocation.href}
                  className="hover:bg-muted/30 flex items-center justify-between gap-4 px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{allocation.invoiceNumber}</p>
                    <p className="text-muted-foreground text-xs">
                      {formatStatus(allocation.invoiceStatus)}
                    </p>
                  </div>
                  <span className="font-medium tabular-nums">
                    {allocation.amount}
                  </span>
                </Link>
              ))}
            </div>
          </DetailCardSection>
        ) : null}

        {payment.refunds && payment.refunds.length > 0 ? (
          <DetailCardSection title="Refunds">
            <div className="divide-border divide-y rounded-lg border">
              {payment.refunds.map((refund) => (
                <div
                  key={refund.id}
                  className="flex items-start justify-between gap-4 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{refund.number}</p>
                    <p className="text-muted-foreground text-xs">
                      {refund.date}
                    </p>
                    {refund.reason ? (
                      <p className="text-muted-foreground mt-1 text-xs">
                        {refund.reason}
                      </p>
                    ) : null}
                  </div>
                  <span className="font-medium tabular-nums">
                    {refund.amount}
                  </span>
                </div>
              ))}
            </div>
          </DetailCardSection>
        ) : null}

        {payment.notes ? (
          <DetailCardSection title="Notes">
            <p className="text-foreground text-sm leading-6">{payment.notes}</p>
          </DetailCardSection>
        ) : null}
        {children}
      </DetailCardBody>
      <DetailCardIdBar>
        <span className="truncate">{payment.id}</span>
      </DetailCardIdBar>
    </DetailCard>
  )
}

function formatStatus(status: string): string {
  return status
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/^./, (character) => character.toUpperCase())
}
