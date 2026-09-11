import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Skeleton } from '@876/ui/skeleton'

import { resolveApp, resolveSubscription } from '../../_data'
import {
  DetailAccordionGroup,
  DetailAccordionSection,
} from '@/components/patterns/detail/detail-accordion'
import { Field } from '@/components/patterns/detail/info-section'
import { formatDate } from '@/lib/format'

type Props = { params: Promise<{ slug: string; subscriptionId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const app = await resolveApp(slug)
  if (!app) return { title: 'Subscription details' }
  return { title: `Subscription details • ${app.name}` }
}

export default function SubscriptionDetailPage({ params }: Props) {
  return (
    <Suspense fallback={<SubscriptionDetailFallback />}>
      <SubscriptionDetailData params={params} />
    </Suspense>
  )
}

async function SubscriptionDetailData({ params }: Props) {
  const { slug, subscriptionId } = await params
  const app = await resolveApp(slug)

  if (!app || app.app_kind !== 'product') notFound()

  const subscription = await resolveSubscription(app.id, subscriptionId)

  if (!subscription) notFound()

  return (
    <div className="mx-auto max-w-3xl">
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
            <p className="text-muted-foreground/80 text-[0.8125rem]">
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
            <p className="text-muted-foreground/80 text-[0.8125rem]">
              Usage data will appear here when telemetry is wired up.
            </p>
          </div>
        </DetailAccordionSection>
      </DetailAccordionGroup>
    </div>
  )
}

function SubscriptionDetailFallback() {
  return (
    <div className="mx-auto max-w-3xl">
      <Skeleton className="h-80 w-full rounded-lg" />
    </div>
  )
}
