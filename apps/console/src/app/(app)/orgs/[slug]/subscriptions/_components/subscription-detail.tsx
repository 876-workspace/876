'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { AdminSubscription } from '@876/platform/compat'
import { Button } from '@876/ui/button'
import { XIcon } from '@876/ui/icons'
import { cn } from '@876/core/utils'

import { appColor } from '@/lib/app-color'
import { statusBadgeClass } from '@/lib/format'
import { humanize, planName } from './subscription-format'
import { SubscriptionOverview } from './subscription-overview'

const DETAIL_TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'transactions', label: 'Transactions' },
  { value: 'activity', label: 'Activity' },
] as const

type TabValue = (typeof DETAIL_TABS)[number]['value']

type Props = {
  subscription: AdminSubscription
  billing: React.ReactNode
  /** Streamed Billing invoices for this subscription. */
  transactions?: React.ReactNode
  /** Lifecycle timeline for this subscription. */
  activity?: React.ReactNode
  /** Today at UTC midnight, in Unix seconds. */
  now: number
  onClose: () => void
  /** Entry/exit animation classes, owned by the split view. */
  className?: string
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize',
        statusBadgeClass(status)
      )}
    >
      {humanize(status)}
    </span>
  )
}

function Flag({ children }: { children: React.ReactNode }) {
  return (
    <span className="border-border bg-muted/40 text-muted-foreground inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium">
      {children}
    </span>
  )
}

export function SubscriptionDetail({
  subscription: sub,
  billing,
  transactions,
  activity,
  now,
  onClose,
  className,
}: Props) {
  // Every one of these is nullable on the resource, so a subscription whose
  // app was deleted would otherwise crash the panel on `.charAt`.
  const appName = sub.app_name || sub.app_slug || sub.app_id || 'Unknown app'
  const note = sub.status_reason || sub.provider_status
  const [tab, setTab] = useState<TabValue>('overview')

  return (
    <section
      className={cn(
        '876-card flex min-w-0 flex-1 flex-col overflow-hidden',
        className
      )}
    >
      <header className="border-876-surface-border flex shrink-0 items-start gap-3 border-b px-6 py-4">
        {sub.app_logo_url ? (
          <Image
            src={sub.app_logo_url}
            alt=""
            width={40}
            height={40}
            unoptimized
            className="size-10 shrink-0 rounded-md object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className={`inline-flex size-10 shrink-0 items-center justify-center rounded-md text-sm font-semibold text-white ${appColor(sub.app_slug || sub.app_id)}`}
          >
            {appName.charAt(0).toUpperCase()}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold tracking-tight">
              {planName(sub)}
            </h2>
            <StatusPill status={sub.status} />
            {sub.cancel_at_period_end && <Flag>Cancels at period end</Flag>}
            {sub.pause_collection && <Flag>Collection paused</Flag>}
            {sub.pending_update && <Flag>Update pending</Flag>}
          </div>
          <p className="text-muted-foreground mt-0.5 truncate text-[0.8125rem]">
            {appName}
            {sub.app_kind && ` · ${sub.app_kind}`}
          </p>
          {note && (
            <p className="text-muted-foreground mt-1 truncate text-xs">
              {humanize(note)}
            </p>
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close subscription details"
          className="text-muted-foreground hover:text-foreground shrink-0"
        >
          <XIcon className="size-4" />
        </Button>
      </header>

      <div
        role="tablist"
        aria-label="Subscription details"
        className="border-876-surface-border shrink-0 border-b px-6 pt-4 pb-3"
      >
        <div className="bg-muted inline-flex w-fit items-center rounded-lg p-[3px]">
          {DETAIL_TABS.map((entry) => (
            <button
              key={entry.value}
              type="button"
              role="tab"
              aria-selected={tab === entry.value}
              onClick={() => setTab(entry.value)}
              className={cn(
                'rounded-md px-4 py-1 text-sm font-medium whitespace-nowrap transition-colors',
                tab === entry.value
                  ? 'text-foreground bg-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </div>

      <div
        key={tab}
        role="tabpanel"
        className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 min-h-0 flex-1 p-6 motion-safe:duration-200 motion-safe:ease-out"
      >
        {tab === 'overview' && (
          <SubscriptionOverview
            subscription={sub}
            billing={billing}
            now={now}
          />
        )}

        {tab === 'transactions' && transactions}
        {tab === 'activity' && activity}
      </div>

      <p className="text-muted-foreground/70 border-876-surface-border shrink-0 truncate border-t px-6 py-3 font-mono text-[0.6875rem]">
        {sub.id}
      </p>
    </section>
  )
}
