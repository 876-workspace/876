import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Badge } from '@876/ui/badge'
import { buttonVariants } from '@876/ui/button'
import {
  Page,
  PageBreadcrumb,
  PageDescription,
  PageHeader,
  PageTitle,
} from '@876/ui/page'

import { requirePagePermission } from '@/lib/auth/billing-context'
import { formatDate, formatMoney } from '@/lib/format'
import { service } from '@/lib/service'

type Props = { params: Promise<{ paymentId: string }> }

export default async function PaymentPage({ params }: Props) {
  const context = await requirePagePermission('payments:read')
  const { paymentId } = await params
  const payment = await service.payments.retrieve(context.tenant.id, paymentId)
  if (!payment) notFound()

  const allocated = payment.invoiceAllocations.reduce(
    (total, allocation) => total + allocation.amount,
    0n
  )

  return (
    <Page>
      <PageBreadcrumb
        href="/payments"
        label="Payments Received"
        className="mb-4"
      />
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader>
          <div className="flex items-center gap-2">
            <PageTitle>{payment.number}</PageTitle>
            <Badge variant="success">Received</Badge>
          </div>
          <PageDescription>
            {payment.customer.name} · {formatDate(payment.paymentDate)}
          </PageDescription>
        </PageHeader>
        {context.permissions.includes('payments:write') ? (
          <Link
            href={`/payments/${payment.id}/edit`}
            className={buttonVariants({ variant: 'outline' })}
          >
            Edit
          </Link>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <section className="876-card overflow-hidden">
          <div className="border-border border-b px-5 py-4">
            <h2 className="font-semibold">Invoice allocations</h2>
          </div>
          <div className="divide-border divide-y">
            {payment.invoiceAllocations.map((allocation) => (
              <Link
                key={allocation.id}
                href={`/invoices/${allocation.invoice.id}`}
                className="hover:bg-muted/30 flex items-center justify-between gap-4 px-5 py-4"
              >
                <div>
                  <p className="font-medium">{allocation.invoice.number}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs capitalize">
                    {allocation.invoice.status.toLowerCase()}
                  </p>
                </div>
                <p className="font-semibold tabular-nums">
                  {formatMoney(allocation.amount, payment.currency)}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="876-card h-fit p-5">
          <h2 className="font-semibold">Payment details</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Detail
              label="Received"
              value={formatMoney(payment.amount, payment.currency)}
            />
            <Detail
              label="Allocated"
              value={formatMoney(allocated, payment.currency)}
            />
            <Detail
              label="Bank charges"
              value={formatMoney(payment.bankCharges, payment.currency)}
            />
            <Detail label="Mode" value={payment.paymentMode.name} />
            <Detail label="Deposit to" value={payment.depositAccount.name} />
            <Detail label="Reference" value={payment.referenceNumber ?? '—'} />
          </dl>
          {payment.notes ? (
            <p className="text-muted-foreground border-border mt-5 border-t pt-4 text-sm leading-6">
              {payment.notes}
            </p>
          ) : null}
        </section>
      </div>
    </Page>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  )
}
