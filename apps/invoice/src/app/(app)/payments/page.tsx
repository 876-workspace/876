import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { CreditCardIcon } from '@876/ui/icons'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import { getInvoiceContext } from '@/lib/auth/context'
import { getBilling } from '@/lib/services/billing'

import { PaymentsTable } from './_components/payments-table'

export const metadata = {
  title: 'Payments Received',
  description: 'Customer payments allocated to invoices.',
}

const PAYMENT_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Payments' },
]

type Props = { searchParams: Promise<{ status?: string }> }

export default async function PaymentsPage({ searchParams }: Props) {
  const { status } = await searchParams
  const selectedStatus = status ?? 'all'
  void selectedStatus

  return (
    <Page>
      <ResourceToolbar
        title="Payments Received"
        titleFilter={
          <StatusFilterHeading
            label="Payments Received"
            value="all"
            options={PAYMENT_STATUS_OPTIONS}
          />
        }
        primaryLabel="New"
        primaryHref="/payments/new"
        primaryVariant="info"
        refresh
      />
      <Suspense
        fallback={
          <DataTableSkeleton
            columns={[
              { label: 'Payment', cell: 'avatar' as const },
              { label: 'Customer' },
              { label: 'Deposit account' },
              { label: 'Amount' },
            ]}
            rows={5}
          />
        }
      >
        <PaymentsTableData />
      </Suspense>
    </Page>
  )
}

async function PaymentsTableData() {
  const context = await getInvoiceContext()
  if (!context) redirect('/no-access')

  const billing = await getBilling(context.orgId)
  const result = await billing.payments.list()

  if (result.error) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center">
        <p className="text-sm font-medium">
          Payments are unavailable right now
        </p>
        <p className="text-muted-foreground mt-1 text-sm">
          {result.error.message}
        </p>
        <p className="text-muted-foreground mt-2 font-mono text-xs">
          {result.error.code}
        </p>
      </div>
    )
  }

  const payments = result.data.data.map((payment) => ({
    id: payment.id,
    number: payment.number,
    customer: { name: payment.customer.name },
    amount: payment.amount,
    currency: payment.currency,
    paymentDate: payment.paymentDate,
    status: payment.status,
    depositAccount: payment.depositAccount.name,
  }))

  return (
    <PaymentsTable
      payments={payments}
      emptyState={
        <Empty className="py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CreditCardIcon />
            </EmptyMedia>
            <EmptyTitle>No payments received</EmptyTitle>
            <EmptyDescription>
              Record a customer payment and distribute it across one or more
              open invoices.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      }
    />
  )
}
