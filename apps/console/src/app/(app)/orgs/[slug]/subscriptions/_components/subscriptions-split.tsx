'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import type { AdminSubscription } from '@876/admin'
import { DataTable } from '@876/ui/data-table'
import { DataTableColumnHeader } from '@876/ui/data-table-column-header'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { CreditCard } from '@876/ui/icons'
import { cn } from '@876/core/utils'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'

import { appColor } from '@/lib/app-color'
import { formatDate } from '@/lib/format'
import { SubscriptionDetail } from './subscription-detail'
import { humanize, planName } from './subscription-format'

/** Exit animation length; keep in step with the panel's `animate-out`. */
const EXIT_MS = 200

type Props = {
  subscriptions: AdminSubscription[]
  billing: React.ReactNode
  /** Streamed Billing invoices for the selected subscription. */
  transactions?: React.ReactNode
  /** Lifecycle timeline for the selected subscription. */
  activity?: React.ReactNode
  /** The `?subscription=` id, resolved server-side. */
  selectedId?: string
  basePath: string
}

function AppCell({
  sub,
  size = 'md',
}: {
  sub: AdminSubscription
  size?: 'sm' | 'md'
}) {
  const name = sub.app_name || sub.app_slug || sub.app_id || 'Unknown app'
  const small = size === 'sm'
  const px = small ? 16 : 24

  return (
    <span
      className={cn('flex min-w-0 items-center', small ? 'gap-1.5' : 'gap-2.5')}
    >
      {sub.app_logo_url ? (
        <Image
          src={sub.app_logo_url}
          alt=""
          width={px}
          height={px}
          unoptimized
          className={cn(
            'shrink-0 rounded-sm object-cover',
            small ? 'size-4' : 'size-6'
          )}
        />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-sm font-semibold text-white',
            small ? 'size-4 text-[0.5rem]' : 'size-6 text-[0.6875rem]',
            appColor(sub.app_slug || sub.app_id)
          )}
        >
          {name.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="min-w-0 truncate">{name}</span>
    </span>
  )
}

/** The condensed column shown once a subscription is selected. */
const planColumn: ColumnDef<AdminSubscription, unknown> = {
  id: 'plan',
  header: 'Plan',
  cell: ({ row }) => (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="truncate font-medium text-sky-600 dark:text-sky-400">
        {planName(row.original)}
      </span>
      <span className="text-muted-foreground text-xs">
        <AppCell sub={row.original} size="sm" />
      </span>
    </div>
  ),
}

const fullColumns: ColumnDef<AdminSubscription, unknown>[] = [
  {
    id: 'plan',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Plan" />
    ),
    cell: ({ row }) => (
      <span className="font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300">
        {planName(row.original)}
      </span>
    ),
  },
  {
    id: 'app',
    accessorKey: 'app_name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="App" />
    ),
    cell: ({ row }) => <AppCell sub={row.original} />,
  },
  {
    id: 'payment_method',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Payment Method" />
    ),
    cell: ({ row }) => {
      const sub = row.original
      if (sub.default_payment_method_id) {
        return (
          <span className="text-muted-foreground font-mono text-[0.8125rem]">
            {sub.default_payment_method_id}
          </span>
        )
      }
      if (sub.collection_method) {
        return (
          <span className="text-muted-foreground text-[0.8125rem] capitalize">
            {humanize(sub.collection_method)}
          </span>
        )
      }
      return <span className="text-muted-foreground">—</span>
    },
  },
  {
    id: 'started',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Started" />
    ),
    cell: ({ row }) => {
      const date = row.original.start_date ?? row.original.created_at
      if (!date) return <span className="text-muted-foreground">—</span>
      return (
        <span className="text-muted-foreground text-[0.8125rem]">
          {formatDate(date)}
        </span>
      )
    },
  },
]

export function SubscriptionsSplit({
  subscriptions,
  billing,
  transactions,
  activity,
  selectedId,
  basePath,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selected = subscriptions.find((sub) => sub.id === selectedId)
  // Closing is animated, so the panel has to outlive the click that dismissed
  // it: hold it mounted for one exit animation, then navigate.
  const [closing, setClosing] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Opening slides the panel in from the side; moving between two rows is a
  // much smaller move, so it only cross-fades — replaying the full entrance
  // would read as the sheet closing and reopening on every row click. The
  // choice is cached per id rather than recomputed, because a later render
  // (streamed transactions landing) must not swap the class mid-animation and
  // restart it. A deep-linked panel is already on screen, so it fades too.
  // Adjusting state during render (not an effect) keeps the entrance class
  // correct for the very commit that shows a newly selected row.
  const [entrance, setEntrance] = useState<{
    id?: string
    kind: 'open' | 'switch'
  }>({
    id: selectedId,
    kind: 'switch',
  })

  if (entrance.id !== selectedId) {
    setEntrance({
      id: selectedId,
      kind: entrance.id === undefined ? 'open' : 'switch',
    })
  }

  const isSwitch = entrance.kind === 'switch'

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    },
    []
  )
  // Today at UTC midnight, read once. Day granularity is what the panel shows,
  // and it keeps the value identical on the server and at hydration for a
  // deep-linked `?subscription=`.
  const [today] = useState(() => Math.floor(Date.now() / 86_400_000) * 86_400)

  function select(id?: string) {
    // A row clicked mid-exit cancels the close rather than opening the next
    // panel already playing its own dismissal.
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
    if (closing) setClosing(false)

    const next = new URLSearchParams(searchParams.toString())

    if (id) next.set('subscription', id)
    else next.delete('subscription')

    const query = next.toString()
    // Opening the panel hides the list toolbar and swaps the layout, so the
    // previous scroll offset no longer points at anything. Let the router
    // return to the top.
    router.push(query ? `${basePath}?${query}` : basePath)
  }

  function requestClose() {
    if (closing) return
    setClosing(true)
    // Deterministic rather than `animationend`: with reduced motion there is
    // no animation to end, and a panel that never unmounts is worse than one
    // that skips its exit.
    closeTimer.current = setTimeout(() => {
      setClosing(false)
      select()
    }, EXIT_MS)
  }

  if (!selected)
    return (
      <div className="876-card overflow-hidden">
        <DataTable
          columns={fullColumns}
          data={subscriptions}
          onRowClick={(sub) => select(sub.id)}
          emptyState={<SubscriptionsEmptyState />}
        />
      </div>
    )

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start">
      <div className="876-card shrink-0 overflow-hidden md:w-72 lg:w-80">
        <DataTable
          columns={[planColumn]}
          data={subscriptions}
          onRowClick={(sub) => select(sub.id)}
        />
      </div>
      <SubscriptionDetail
        key={selected.id}
        subscription={selected}
        billing={billing}
        transactions={transactions}
        activity={activity}
        now={today}
        onClose={requestClose}
        className={cn(
          'motion-safe:duration-300 motion-safe:ease-out',
          closing
            ? 'motion-safe:animate-out motion-safe:fade-out motion-safe:slide-out-to-right-4 motion-safe:fill-mode-forwards motion-safe:duration-200 motion-safe:ease-in'
            : isSwitch
              ? 'motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200'
              : 'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4'
        )}
      />
    </div>
  )
}

function SubscriptionsEmptyState() {
  return (
    <Empty className="border-0">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CreditCard aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>No subscriptions</EmptyTitle>
      </EmptyHeader>
    </Empty>
  )
}
