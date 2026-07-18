import Image from 'next/image'
import { notFound } from 'next/navigation'

import type { AdminPrice, AdminSubscription } from '@876/admin'
import { Badge } from '@876/ui/badge'
import { Page, PageBreadcrumb } from '@876/ui/page'

import { ErrorState } from '@/components/enterprise/error-state'
import { getAdminClient } from '@/lib/auth/admin-client'
import { requireOrgPermission, requireSession } from '@/lib/auth/guards'

export default async function OrganizationAppDetailPage({
  params,
}: {
  params: Promise<{ slug: string; appSlug: string }>
}) {
  const { slug, appSlug } = await params
  const sessionUser = await requireSession(`/${slug}/apps/${appSlug}`)
  const { membership } = await requireOrgPermission(
    sessionUser.id,
    slug,
    'apps:read'
  )

  const client = await getAdminClient()
  const subscriptionResult = await client.orgs.subscriptions.retrieveBySlug(
    membership.organization.id,
    appSlug
  )
  const subscription = subscriptionResult.data
  if (!subscription) notFound()

  const [appResult, productsResult] = await Promise.all([
    client.apps.retrieve(subscription.app_id),
    client.products.list({ appId: subscription.app_id, status: 'active' }),
  ])
  const app = appResult.data
  if (!app || app.app_kind === 'internal') notFound()

  if (productsResult.error) {
    return (
      <Page>
        <PageBreadcrumb href={`/${slug}/apps`} label="Apps" className="mb-4" />
        <ErrorState error={productsResult.error} />
      </Page>
    )
  }

  const products = productsResult.data.data
  const currentProductIds = new Set(
    subscription.items.map((item) => item.product_id).filter(Boolean)
  )

  return (
    <Page>
      <PageBreadcrumb href={`/${slug}/apps`} label="Apps" className="mb-4" />

      <div className="mb-6 flex items-start gap-4">
        <AppMark name={app.name} logoUrl={app.logo_url} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="876-page-title">{app.name}</h1>
            <Badge
              variant={
                subscription.status === 'active' ||
                subscription.status === 'trialing'
                  ? 'success'
                  : 'warning'
              }
            >
              {subscription.status}
            </Badge>
          </div>
          {app.homepage_url && (
            <a
              href={app.homepage_url}
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              {app.homepage_url.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>
      </div>

      <div className="max-w-3xl space-y-5">
        <section className="876-card p-5">
          <h2 className="text-foreground mb-4 text-sm font-medium">
            Subscription
          </h2>
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <DetailItem label="Status" value={subscription.status} />
            <DetailItem
              label="Current period"
              value={formatPeriod(subscription)}
            />
            {subscription.trial_end !== null && (
              <DetailItem
                label="Trial ends"
                value={formatDate(subscription.trial_end)}
              />
            )}
            <DetailItem
              label="Renewal"
              value={
                subscription.cancel_at_period_end
                  ? 'Cancels at period end'
                  : 'Renews automatically'
              }
            />
          </dl>
        </section>

        {products.length > 0 && (
          <section className="876-card p-5">
            <h2 className="text-foreground mb-4 text-sm font-medium">Plans</h2>
            <ul className="divide-border divide-y">
              {products.map((product) => {
                const isCurrent = currentProductIds.has(product.id)
                return (
                  <li
                    key={product.id}
                    className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        {product.name}
                        {isCurrent && <Badge variant="outline">Current</Badge>}
                      </div>
                      {product.description && (
                        <div className="text-muted-foreground mt-0.5 text-xs">
                          {product.description}
                        </div>
                      )}
                    </div>
                    <div className="text-muted-foreground shrink-0 text-sm">
                      {formatPrices(product.prices)}
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
      </div>
    </Page>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs font-medium">{label}</dt>
      <dd className="mt-0.5 text-sm capitalize">{value}</dd>
    </div>
  )
}

function AppMark({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt=""
        width={48}
        height={48}
        unoptimized
        className="size-12 rounded-lg border object-contain"
      />
    )
  }

  return (
    <span className="bg-876-accent-surface text-876-accent-fg flex size-12 items-center justify-center rounded-lg text-lg font-semibold">
      {name.charAt(0).toUpperCase()}
    </span>
  )
}

function formatPeriod(subscription: AdminSubscription): string {
  if (
    subscription.current_period_start === null ||
    subscription.current_period_end === null
  ) {
    return '—'
  }

  return `${formatDate(subscription.current_period_start)} – ${formatDate(subscription.current_period_end)}`
}

function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatPrices(prices: AdminPrice[]): string {
  const active = prices.filter((price) => price.status === 'active')
  if (active.length === 0) return '—'

  return active
    .map((price) => {
      const amount = (price.unit_amount / 100).toLocaleString('en-US', {
        style: 'currency',
        currency: price.currency.toUpperCase(),
      })
      return price.billing_interval
        ? `${amount}/${price.billing_interval}`
        : amount
    })
    .join(' · ')
}
