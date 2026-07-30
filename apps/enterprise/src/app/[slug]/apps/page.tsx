import Image from 'next/image'
import Link from 'next/link'

import type { Subscription } from '@876/sdk'
import { Badge } from '@876/ui/badge'
import { Empty, EmptyHeader, EmptyTitle } from '@876/ui/empty'
import { Page, PageHeader, PageTitle } from '@876/ui/page'

import { ErrorState } from '@/components/enterprise/error-state'
import { get876ServerClient } from '@/lib/876/server'
import { requireOrgPermission, requireSession } from '@/lib/auth/guards'

export default async function OrganizationAppsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const sessionUser = await requireSession(`/${slug}/apps`)
  const { membership } = await requireOrgPermission(
    sessionUser.id,
    slug,
    'apps:read'
  )

  const client = await get876ServerClient()
  const [subscriptionsResult, productsResult] = await Promise.all([
    client.subscriptions.list(membership.organization.id),
    client.products.list(),
  ])
  const loadError = subscriptionsResult.error ?? productsResult.error
  if (loadError || !subscriptionsResult.data || !productsResult.data) {
    return (
      <Page>
        <PageHeader>
          <PageTitle>Apps</PageTitle>
        </PageHeader>
        <ErrorState
          error={
            loadError ?? { code: 'admin/error', message: 'An error occurred.' }
          }
        />
      </Page>
    )
  }

  const subscriptions = subscriptionsResult.data.data
  const productNamesById = new Map(
    productsResult.data.data.map((product) => [product.id, product.name])
  )

  const provisioned = subscriptions.filter(
    (
      subscription
    ): subscription is Subscription & {
      app_slug: string
      app_name: string
    } =>
      subscription.app_slug !== null &&
      subscription.app_name !== null &&
      subscription.app_kind !== 'internal'
  )

  return (
    <Page>
      <PageHeader>
        <PageTitle>Apps</PageTitle>
      </PageHeader>

      {provisioned.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No apps</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {provisioned.map((subscription) => (
            <Link
              key={subscription.id}
              href={`/${slug}/apps/${subscription.app_slug}`}
              className="876-card hover:border-876-accent-fg/30 block p-5 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <AppMark
                  name={subscription.app_name}
                  logoUrl={subscription.app_logo_url}
                />
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
              <div className="mt-3 text-sm font-medium">
                {subscription.app_name}
              </div>
              <div className="text-muted-foreground mt-0.5 truncate text-xs">
                {planLabel(subscription, productNamesById)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </Page>
  )
}

function AppMark({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt=""
        width={40}
        height={40}
        unoptimized
        className="size-10 rounded-lg border object-contain"
      />
    )
  }

  return (
    <span className="bg-876-accent-surface text-876-accent-fg flex size-10 items-center justify-center rounded-lg text-base font-semibold">
      {name.charAt(0).toUpperCase()}
    </span>
  )
}

function planLabel(
  subscription: Subscription,
  productNamesById: Map<string, string>
): string {
  const names = subscription.items
    .map((item) =>
      item.product_id
        ? (productNamesById.get(item.product_id) ?? item.product_slug)
        : item.product_slug
    )
    .filter(Boolean)
  if (names.length === 0) return 'No plan'

  return names.join(', ')
}
