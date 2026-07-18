import { Badge } from '@876/ui/badge'
import { CreditCard } from '@876/ui/icons'
import {
  Page,
  PageBreadcrumb,
  PageDescription,
  PageHeader,
  PageTitle,
} from '@876/ui/page'

import { ProviderConnectionCreateForm } from '@/components/billing-engine-settings-forms'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { formatDate } from '@/lib/format'
import { service } from '@/lib/service'

export const metadata = { title: 'Payment Providers - Settings' }

export default async function PaymentProvidersSettingsPage() {
  const context = await requirePagePermission('payments:read')
  const [providers, connections] = await Promise.all([
    service.paymentProviders.listCatalog(),
    service.paymentProviders.connections.list(context.tenant.id),
  ])
  const canManage = context.permissions.includes('payments:write')

  return (
    <Page>
      <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
      <PageHeader>
        <PageTitle>Payment Providers</PageTitle>
        <PageDescription>
          Connect processors without making invoices or payments depend on one
          provider.
        </PageDescription>
      </PageHeader>

      <div className="space-y-6">
        <div className="border-info/30 bg-info/5 text-info rounded-lg border px-4 py-3 text-sm">
          Connections are configuration records only for now. Payment capture
          and webhooks remain disabled until an adapter is implemented and
          activated.
        </div>
        {canManage ? (
          <ProviderConnectionCreateForm
            providers={providers.map((provider) => ({
              value: provider.id,
              label: provider.name,
            }))}
          />
        ) : null}

        <section className="876-card overflow-hidden">
          <header className="border-border border-b px-5 py-4">
            <h2 className="font-semibold text-balance">Connections</h2>
          </header>
          {connections.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <CreditCard className="text-muted-foreground mx-auto size-6" />
              <p className="mt-3 font-medium">No provider connections</p>
              <p className="text-muted-foreground mt-1 text-sm text-pretty">
                Manual payments continue to work without a payment provider.
              </p>
            </div>
          ) : (
            <div className="divide-border divide-y">
              {connections.map((connection) => (
                <div
                  key={connection.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
                >
                  <span className="876-icon-tile">
                    <CreditCard className="text-876-blue size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{connection.name}</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {connection.provider.name} ·{' '}
                      {connection.environment.toLowerCase()}
                      {connection.merchantAccountId
                        ? ` · Merchant ${connection.merchantAccountId}`
                        : ''}
                    </p>
                  </div>
                  <Badge variant={providerStatusVariant(connection.status)}>
                    {connection.status.toLowerCase()}
                  </Badge>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    Added {formatDate(connection.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Page>
  )
}

function providerStatusVariant(status: string) {
  if (status === 'ACTIVE') return 'success' as const
  if (status === 'ERROR') return 'destructive' as const
  if (status === 'PENDING') return 'warning' as const
  return 'secondary' as const
}
