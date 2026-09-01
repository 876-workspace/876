import { Badge } from '@876/ui/badge'
import { CircleStackIcon } from '@876/ui/icons'
import { Page, PageBreadcrumb } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'

import { ConnectionActions } from './_components/connection-actions'
import {
  canManageBilling,
  requirePagePermission,
} from '@/lib/auth/billing-context'
import { formatDate } from '@/lib/format'
import { getAccountingProviderClient } from '@/lib/services/accounting-providers'

export const metadata = { title: 'Accounting Providers - Settings' }

export default async function AccountingProvidersPage() {
  const context = await requirePagePermission('settings:read')
  const accounting = await getAccountingProviderClient()
  const [providersResult, connectionsResult] = await Promise.all([
    accounting.accountingProviders.list(),
    accounting.accountingProviders.connections.list(context.orgId),
  ])

  const providers = providersResult.data?.data ?? []
  const connections = connectionsResult.data?.data ?? []
  const providerById = new Map(
    providers.map((provider) => [provider.id, provider] as const)
  )
  const canManage = canManageBilling(context.role)
  const loadError =
    providersResult.error?.message ?? connectionsResult.error?.message ?? null

  return (
    <Page>
      <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
      <ResourceToolbar
        title="Accounting providers"
        description="Connect external accounting systems without moving canonical financial ownership out of 876 Billing."
        primaryLabel={canManage ? 'Add' : undefined}
        primaryHref={canManage ? '/settings/accounting-providers/new' : undefined}
        primaryVariant="info"
        refresh
      />

      <div className="space-y-8">
        {loadError ? (
          <div className="border-warning/30 bg-warning/5 text-warning rounded-lg border px-4 py-3 text-sm">
            Accounting provider data could not be loaded completely. {loadError}
          </div>
        ) : null}

        <section className="space-y-4">
          <div>
            <h2 className="font-semibold text-balance">Connections</h2>
            <p className="text-muted-foreground mt-1 text-sm text-pretty">
              Billing remains the source of truth. Active connections receive
              asynchronous projections after local financial writes succeed.
            </p>
          </div>

          <div className="876-card overflow-hidden">
            {connections.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <CircleStackIcon className="text-muted-foreground mx-auto size-6" />
                <p className="mt-3 font-medium">No accounting connections</p>
                <p className="text-muted-foreground mt-1 text-sm text-pretty">
                  Add a provider connection when this workspace is ready to
                  project Billing records to an external accounting system.
                </p>
              </div>
            ) : (
              <div className="divide-border divide-y">
                {connections.map((connection) => {
                  const provider = providerById.get(connection.providerId)
                  return (
                    <div
                      key={connection.id}
                      className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center"
                    >
                      <span className="876-icon-tile">
                        <CircleStackIcon className="text-876-blue size-4" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{connection.name}</p>
                          <Badge variant={statusVariant(connection.status)}>
                            {connection.status}
                          </Badge>
                          <Badge variant="outline">{connection.mode}</Badge>
                        </div>
                        <p className="text-muted-foreground mt-1 text-xs">
                          {provider?.name ?? connection.providerKey} ·{' '}
                          {connection.environment}
                          {connection.providerOrganizationId
                            ? ` · Organization ${connection.providerOrganizationId}`
                            : ' · Authorization not completed'}
                        </p>
                        <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                          <span>
                            Last sync: {formatTimestamp(connection.lastSyncedAt)}
                          </span>
                          <span>
                            Last successful: {' '}
                            {formatTimestamp(connection.lastSuccessfulSyncAt)}
                          </span>
                          {connection.lastErrorCode ? (
                            <span className="text-destructive">
                              {connection.lastErrorCode}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <ConnectionActions
                        connectionId={connection.id}
                        connectionName={connection.name}
                        status={connection.status}
                        canManage={canManage}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="font-semibold text-balance">Available providers</h2>
            <p className="text-muted-foreground mt-1 text-sm text-pretty">
              Capabilities describe what Billing can currently project or adopt
              through each adapter.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {providers.map((provider) => (
              <div key={provider.id} className="876-card p-5">
                <div className="flex items-start gap-3">
                  <span className="876-icon-tile">
                    <CircleStackIcon className="text-876-blue size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{provider.name}</p>
                      <Badge variant={provider.isActive ? 'success' : 'secondary'}>
                        {provider.isActive ? 'Available' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
                      {capabilitySummary(provider.capabilities)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Page>
  )
}

function formatTimestamp(value: number | null) {
  return value ? formatDate(value) : 'Never'
}

function statusVariant(status: 'pending' | 'active' | 'disabled' | 'error') {
  if (status === 'active') return 'success' as const
  if (status === 'error') return 'destructive' as const
  if (status === 'pending') return 'warning' as const
  return 'secondary' as const
}

function capabilitySummary(capabilities: {
  customers: boolean
  items: boolean
  estimates: boolean
  invoices: boolean
  recurringInvoices: boolean
  paymentsReceived: boolean
  imports: boolean
  webhooks: boolean
}) {
  const enabled = [
    capabilities.customers && 'customers',
    capabilities.items && 'items',
    capabilities.estimates && 'estimates',
    capabilities.invoices && 'invoices',
    capabilities.recurringInvoices && 'recurring invoices',
    capabilities.paymentsReceived && 'payments received',
    capabilities.imports && 'customer/item adoption',
    capabilities.webhooks && 'inbound webhooks',
  ].filter(Boolean)

  return enabled.length > 0
    ? `Supports ${enabled.join(', ')}.`
    : 'No accounting capabilities are currently enabled.'
}
