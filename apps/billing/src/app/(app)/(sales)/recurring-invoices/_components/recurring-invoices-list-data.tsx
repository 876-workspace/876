'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { resolveRecurringInvoiceStatus } from '@876/billing-ui/document-status'
import { AppError } from '@876/ui/app-error'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { ReceiptText } from '@876/ui/icons'

import { client } from '@/lib/client'
import { RECURRING_INVOICES_SKELETON_COLUMNS } from './recurring-invoices-skeleton-columns'
import { RecurringInvoicesList } from './recurring-invoices-list'
import type { ComponentProps } from 'react'

type Row = ComponentProps<typeof RecurringInvoicesList>['profiles'][number]

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; profiles: Row[] }
  | { status: 'error'; code: string; message: string }

function toRow(
  profile: Record<string, unknown>,
  customerNames: Map<string, string>
): Row {
  const frequency = profile.frequency as
    { intervalUnit?: unknown; intervalCount?: unknown } | undefined
  return {
    id: String(profile.id),
    profileName: String(profile.profileName ?? profile.id),
    customer: {
      name: customerNames.get(String(profile.customerId ?? '')) ?? '—',
    },
    frequency: {
      intervalUnit: String(frequency?.intervalUnit ?? 'month'),
      intervalCount:
        typeof frequency?.intervalCount === 'number'
          ? frequency.intervalCount
          : 1,
    },
    totalAmount: String(profile.totalAmount ?? '0'),
    currency: String(profile.currency ?? 'JMD'),
    status: String(profile.status ?? 'active') as Row['status'],
    nextRunAt: typeof profile.nextRunAt === 'number' ? profile.nextRunAt : null,
    lastRunAt: typeof profile.lastRunAt === 'number' ? profile.lastRunAt : null,
    generatedCount:
      typeof profile.generatedCount === 'number' ? profile.generatedCount : 0,
  }
}

/**
 * Data half of the list column. The split-view layout cannot read the status
 * filter from the URL, so this client component reads it and threads it into
 * the SDK list call — the API filters, the UI never trims rows locally.
 */
export function RecurringInvoicesListData() {
  const rawStatus = useSearchParams().get('status')
  const selectedStatus = resolveRecurringInvoiceStatus(rawStatus)

  return (
    <RecurringInvoicesListDataContent
      key={selectedStatus}
      selectedStatus={selectedStatus}
    />
  )
}

function RecurringInvoicesListDataContent({
  selectedStatus,
}: {
  selectedStatus: ReturnType<typeof resolveRecurringInvoiceStatus>
}) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    const params =
      selectedStatus === 'all'
        ? {}
        : {
            status: selectedStatus as
              'active' | 'paused' | 'stopped' | 'expired',
          }

    Promise.all([
      client.recurringInvoices.list(params),
      client.customers.list({ limit: 100 }),
    ]).then(([profiles, customers]) => {
      if (cancelled) return
      if (profiles.error) {
        setState({
          status: 'error',
          code: profiles.error.code,
          message: profiles.error.message,
        })
        return
      }
      const names = new Map(
        (customers.data?.data ?? []).map((customer) => [
          customer.id,
          customer.name,
        ])
      )
      setState({
        status: 'ready',
        profiles: profiles.data.data.map((profile) =>
          toRow(profile as unknown as Record<string, unknown>, names)
        ),
      })
    })

    return () => {
      cancelled = true
    }
  }, [selectedStatus])

  if (state.status === 'loading')
    return (
      <div className="flex h-full min-h-0 flex-col gap-3">
        <DataTableSkeleton
          columns={RECURRING_INVOICES_SKELETON_COLUMNS}
          rows={5}
        />
      </div>
    )

  if (state.status === 'error')
    return (
      <div className="flex h-full min-h-0 flex-col gap-3">
        <AppError error={{ code: state.code, message: state.message }} />
      </div>
    )

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <RecurringInvoicesList
        profiles={state.profiles}
        emptyState={
          <Empty className="py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ReceiptText />
              </EmptyMedia>
              <EmptyTitle>No recurring invoices yet</EmptyTitle>
            </EmptyHeader>
          </Empty>
        }
      />
    </div>
  )
}
