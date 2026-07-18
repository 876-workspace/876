import Image from 'next/image'
import Link from 'next/link'

import type { AdminApp, AdminSubscription } from '@876/admin'
import { Badge } from '@876/ui/badge'
import { Empty, EmptyHeader, EmptyTitle } from '@876/ui/empty'
import { Page, PageHeader, PageTitle } from '@876/ui/page'

import { ErrorState } from '@/components/enterprise/error-state'
import { getAdminClient } from '@/lib/auth/admin-client'
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

  const client = await getAdminClient()
  const [subscriptionsResult, appsResult, productsResult] = await Promise.all([
    client.orgs.subscriptions.list(membership.organization.id),
    client.apps.list({ limit: 100 }),
    client.products.list(),
  ])
  const loadError =
    subscriptionsResult.error ?? appsResult.error ?? productsResult.error
  if (
    loadError ||
    !subscriptionsResult.data ||
    !appsResult.data ||
    !productsResult.data
  ) {
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

  const subscriptions = subscriptionsResult.data
  const appsById = new Map(appsResult.data.data.map((app) => [app.id, app]))
  const productNamesById = new Map(
    productsResult.data.data.map((product) => [product.id, product.name])
  )

  const provisioned = subscriptions
    .map((subscription) => ({
      subscription,
      app: appsById.get(subscription.app_id) ?? null,
    }))
    .filter(
      (entry): entry is { subscription: AdminSubscription; app: AdminApp } =>
        entry.app !== null && entry.app.app_kind !== 'internal'
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
          {provisioned.map(({ subscription, app }) => (
            <Link
              key={subscription.id}
              href={`/${slug}/apps/${app.slug}`}
              className="876-card hover:border-876-accent-fg/30 block p-5 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <AppMark name={app.name} logoUrl={app.logo_url} />
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
              <div className="mt-3 text-sm font-medium">{app.name}</div>
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
  subscription: AdminSubscription,
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
