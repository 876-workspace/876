'use client'

import Image from 'next/image'
import type { AdminSubscription, AdminSubscriptionItem } from '@876/admin'
import { Button } from '@876/ui/button'
import { XIcon } from '@876/ui/icons'
import { cn } from '@876/core/utils'

import { appColor } from '@/lib/app-color'
import { formatDate, formatDateTime, statusBadgeClass } from '@/lib/format'
import { humanize, planName } from './subscription-format'

type Props = {
  subscription: AdminSubscription
  /** Billing account id → display label, resolved by the page. */
  billingAccounts: Record<string, string>
  /** Today at UTC midnight, in Unix seconds. */
  now: number
  onClose: () => void
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

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h3 className="text-muted-foreground text-[0.6875rem] tracking-wide uppercase">
        {title}
      </h3>
      <div className="mt-2">{children}</div>
    </section>
  )
}

function Field({
  label,
  value,
  mono,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 first:pt-0 last:pb-0">
      <dt className="text-muted-foreground shrink-0 text-[0.8125rem]">
        {label}
      </dt>
      <dd
        className={cn(
          'min-w-0 truncate text-right text-[0.8125rem]',
          mono && 'font-mono text-xs'
        )}
      >
        {value}
      </dd>
    </div>
  )
}

/** How far through the current billing period this subscription is. */
function PeriodBar({
  start,
  end,
  now,
  ending,
}: {
  start: number
  end: number
  now: number
  ending: boolean
}) {
  const span = Math.max(end - start, 1)
  const elapsed = Math.min(Math.max(now - start, 0), span)
  const pct = Math.round((elapsed / span) * 100)
  const daysLeft = Math.max(Math.ceil((end - now) / 86400), 0)
  const soon = daysLeft <= 7

  return (
    <div>
      <div className="text-muted-foreground flex items-baseline justify-between gap-3 text-xs">
        <span className="truncate">
          {formatDate(start)} &ndash; {formatDate(end)}
        </span>
        <span
          className={cn(
            'shrink-0 tabular-nums',
            soon && 'text-amber-700 dark:text-amber-400'
          )}
        >
          {daysLeft === 0
            ? ending
              ? 'Ends today'
              : 'Renews today'
            : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
        </span>
      </div>
      <div className="bg-muted mt-1.5 h-1 overflow-hidden rounded-full">
        <div
          className={cn(
            'h-full rounded-full',
            soon ? 'bg-amber-500/70' : 'bg-sky-500/70'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function ItemRow({ item }: { item: AdminSubscriptionItem }) {
  return (
    <li className="flex items-baseline gap-3 py-2 text-[0.8125rem] first:pt-0 last:pb-0">
      <span className="min-w-0 flex-1 truncate">
        {item.product_name || item.product_slug || (
          <span className="text-muted-foreground">Unnamed product</span>
        )}
      </span>
      <span className="text-muted-foreground/70 shrink-0 font-mono text-[0.6875rem]">
        {item.price_id}
      </span>
      <span className="w-10 shrink-0 text-right tabular-nums">
        &times;{item.quantity}
      </span>
    </li>
  )
}

export function SubscriptionDetail({
  subscription: sub,
  billingAccounts,
  now,
  onClose,
}: Props) {
  const appName = sub.app_name || sub.app_slug || sub.app_id
  const note = sub.status_reason || sub.provider_status

  return (
    <section className="876-card min-w-0 flex-1 overflow-hidden">
      <header className="border-876-surface-border flex items-start gap-3 border-b px-5 py-4">
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

      <div className="flex flex-col gap-6 p-5">
        {sub.current_period_start && sub.current_period_end && (
          <Section title="Current period">
            <PeriodBar
              start={sub.current_period_start}
              end={sub.current_period_end}
              now={now}
              ending={sub.cancel_at_period_end}
            />
          </Section>
        )}

        <Section title="Billing">
          <dl className="divide-876-surface-border divide-y">
            <Field
              label="Collection"
              value={
                <span className="capitalize">
                  {humanize(sub.collection_method)}
                </span>
              }
            />
            {sub.billing_account_id && (
              <Field
                label="Billed to"
                value={
                  billingAccounts[sub.billing_account_id] ??
                  'Unnamed billing account'
                }
              />
            )}
            {sub.default_payment_method_id && (
              <Field
                label="Payment method"
                value={sub.default_payment_method_id}
                mono
              />
            )}
            {sub.latest_invoice_id && (
              <Field
                label="Latest invoice"
                value={sub.latest_invoice_id}
                mono
              />
            )}
            {sub.billing_cycle_anchor && (
              <Field
                label="Cycle anchor"
                value={formatDate(sub.billing_cycle_anchor)}
              />
            )}
            {sub.schedule_id && (
              <Field label="Schedule" value={sub.schedule_id} mono />
            )}
          </dl>
        </Section>

        <Section title="Lifecycle">
          <dl className="divide-876-surface-border divide-y">
            {sub.start_date && (
              <Field label="Started" value={formatDate(sub.start_date)} />
            )}
            {sub.trial_start && sub.trial_end && (
              <Field
                label="Trial"
                value={`${formatDate(sub.trial_start)} – ${formatDate(sub.trial_end)}`}
              />
            )}
            {sub.cancel_at && (
              <Field label="Cancels" value={formatDate(sub.cancel_at)} />
            )}
            {sub.canceled_at && (
              <Field label="Canceled" value={formatDate(sub.canceled_at)} />
            )}
            {sub.ended_at && (
              <Field label="Ended" value={formatDate(sub.ended_at)} />
            )}
            <Field label="Created" value={formatDateTime(sub.created_at)} />
            <Field label="Updated" value={formatDateTime(sub.updated_at)} />
          </dl>
        </Section>

        {sub.items.length > 0 && (
          <Section title={`Items (${sub.items.length})`}>
            <ul className="divide-876-surface-border divide-y">
              {sub.items.map((item) => (
                <ItemRow key={item.id} item={item} />
              ))}
            </ul>
          </Section>
        )}

        <p className="text-muted-foreground/70 truncate font-mono text-[0.6875rem]">
          {sub.id}
        </p>
      </div>
    </section>
  )
}
