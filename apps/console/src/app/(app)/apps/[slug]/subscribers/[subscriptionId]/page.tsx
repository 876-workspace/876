import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { $876 } from '@/lib/876'
import { resolveApp } from '../../_data'
import {
  DetailAccordionGroup,
  DetailAccordionSection,
} from '@/components/detail/detail-accordion'
import { Field } from '@/components/detail/info-section'
import { formatDate } from '@/lib/format'
import { cn } from '@876/core/utils'

type Props = { params: Promise<{ slug: string; subscriptionId: string }> }

function getStatusDotColor(status: string) {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'bg-emerald-500'
    case 'past_due':
    case 'unpaid':
    case 'paused':
      return 'bg-amber-500'
    case 'canceled':
    case 'incomplete_expired':
      return 'bg-slate-400'
    case 'incomplete':
    case 'blocked':
      return 'bg-red-500'
    default:
      return 'bg-muted-foreground'
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const app = await resolveApp(slug)
  if (!app) return { title: 'Subscription details' }
  return { title: `Subscription details • ${app.name}` }
}

export default async function SubscriptionDetailPage({ params }: Props) {
  const { slug, subscriptionId } = await params
  const app = await resolveApp(slug)

  if (!app || app.app_kind !== 'product') notFound()

  const { data } = await $876.apps.subscriptions.list(app.id)
  const subscriptions = data ?? []
  const subscription = subscriptions.find((s) => s.id === subscriptionId)

  if (!subscription) notFound()

  const { data: org } = await $876.orgs.retrieve(subscription.organization_id)

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <h1 className="text-foreground text-xl font-medium tracking-tight">
            {org?.name ?? org?.slug ?? subscription.organization_id}
          </h1>
          <div className="text-muted-foreground flex items-center gap-1.5 text-sm font-medium">
            <span
              className={cn(
                'size-2 rounded-full',
                getStatusDotColor(subscription.status)
              )}
            />
            <span className="capitalize">
              {subscription.status.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      <DetailAccordionGroup defaultValue="overview">
        <DetailAccordionSection
          title="Subscription overview"
          value="overview"
          icon="activity"
        >
          <Field
            label="Status"
            value={
              <span className="capitalize">
                {subscription.status.replace('_', ' ')}
              </span>
            }
          />
          {subscription.current_period_start && (
            <Field
              label="Current period start"
              value={formatDate(subscription.current_period_start)}
            />
          )}
          {subscription.current_period_end && (
            <Field
              label="Current period end"
              value={formatDate(subscription.current_period_end)}
            />
          )}
          {subscription.trial_start && (
            <Field
              label="Trial start"
              value={formatDate(subscription.trial_start)}
            />
          )}
          {subscription.trial_end && (
            <Field
              label="Trial end"
              value={formatDate(subscription.trial_end)}
            />
          )}
          <Field
            label="Cancels at period end"
            value={subscription.cancel_at_period_end ? 'Yes' : 'No'}
          />
          {subscription.canceled_at && (
            <Field
              label="Canceled at"
              value={formatDate(subscription.canceled_at)}
            />
          )}
          <Field label="Subscription ID" value={subscription.id} mono />
        </DetailAccordionSection>

        <DetailAccordionSection title="Invoices" value="invoices" icon="list">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-muted-foreground font-medium">
              No invoices available
            </p>
            <p className="text-muted-foreground/80 text-sm">
              Invoices will appear here when the billing repository is
              implemented.
            </p>
          </div>
        </DetailAccordionSection>

        <DetailAccordionSection
          title="Usage & tracking"
          value="usage"
          icon="activity"
        >
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-muted-foreground font-medium">
              Usage tracking unavailable
            </p>
            <p className="text-muted-foreground/80 text-sm">
              Usage data will appear here when telemetry is wired up.
            </p>
          </div>
        </DetailAccordionSection>
      </DetailAccordionGroup>
    </div>
  )
}
