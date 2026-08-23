import type { AdminSubscription, AdminSubscriptionItem } from '@876/admin'

import { formatDate } from '@/lib/format'
import { cn } from '@876/core/utils'
import { humanize } from './subscription-format'

type Props = {
  subscription: AdminSubscription
  /** Streamed billing-account/payment-method summary. */
  billing: React.ReactNode
  /** Today at UTC midnight, in Unix seconds. */
  now: number
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

/** "Live overview" tab: period progress, billing facts, and plan items. */
export function SubscriptionOverview({
  subscription: sub,
  billing,
  now,
}: Props) {
  return (
    <div className="flex flex-col gap-6">
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
        <div className="border-876-surface-border mt-4 border-t pt-4">
          {billing}
        </div>
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
    </div>
  )
}
