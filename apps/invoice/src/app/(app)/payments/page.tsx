import { CreditCardIcon } from '@876/ui/icons'
import { Suspense } from 'react'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { Page } from '@876/ui/page'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'
import { redirect } from 'next/navigation'

import { get876Client } from '@/lib/876'
import { getInvoiceContext } from '@/lib/auth/context'
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
  const $876 = await get876Client(context.orgId)
  const result = (await $876.payments
    .list()
    .catch(
      () => ({ data: null, error: { code: 'unreachable' } }) as const
    )) as unknown as { data: { data: unknown[] } | null; error: unknown | null }
  if (result.error || !result.data || result.data.data.length === 0) {
    return (
      <PaymentsTable
        payments={[]}
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
  const payments = (result.data.data as Record<string, unknown>[]).map((p) => ({
    id: String(p.id),
    number: String(p.number ?? p.id),
    customer: {
      name: String(
        (p.customer as Record<string, unknown>)?.name ?? p.customerName ?? '—'
      ),
    },
    amount: (p.amount as string) ?? '0',
    currency: String(p.currency ?? 'JMD'),
    paymentDate:
      typeof p.paymentDate === 'number'
        ? (p.paymentDate as number)
        : typeof p.createdAt === 'number'
          ? (p.createdAt as number)
          : Date.now() / 1000,
    status: String(p.status ?? 'RECEIVED'),
    depositAccount: String(
      (p.depositAccount as Record<string, unknown>)?.name ??
        p.accountName ??
        'Undeposited'
    ),
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
