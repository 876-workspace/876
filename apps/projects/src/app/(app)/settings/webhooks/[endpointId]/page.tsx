import { WebhookDeliveryTable } from '@876/projects-ui/platform/webhook-delivery-table'
import { AppError } from '@876/ui/app-error'
import { buttonVariants } from '@876/ui/button'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'
import { toUiWebhookDelivery } from '@/lib/integration-mappers'
import { integration } from '@/lib/services/integration'

import { WebhookDeliveryManager } from './_components/webhook-delivery-manager'

export const metadata = { title: 'Webhook endpoint' }

type Props = { params: Promise<{ endpointId: string }> }

export default async function WebhookEndpointPage({ params }: Props) {
  await requireAppAccess({ module: 'projects', permission: 'projects.view' })
  await requireProjectsContext()
  const { endpointId } = await params
  const decodedId = decodeURIComponent(endpointId)

  const [endpoint, deliveries] = await Promise.all([
    integration.retrieveWebhookEndpoint(decodedId),
    integration.listWebhookDeliveries({ endpointId: decodedId, limit: 25 }),
  ])

  if (endpoint.error?.code === 'projects/webhook-endpoint-not-found') notFound()
  if (endpoint.error || !endpoint.data)
    return (
      <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
        <PageBreadcrumb
          href="/settings/webhooks"
          label="Webhooks"
          className="mb-4"
        />
        <AppError
          title="The endpoint could not be loaded"
          error={
            endpoint.error ?? {
              code: 'projects/webhook-unavailable',
              message: 'The endpoint could not be loaded.',
            }
          }
          variant="banner"
        />
      </div>
    )

  const rows = (deliveries.data?.data ?? []).map(toUiWebhookDelivery)

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb
        href="/settings/webhooks"
        label="Webhooks"
        className="mb-4"
      />
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="876-page-title font-mono text-base break-all">
          {endpoint.data.url}
        </h1>
        <Link
          href={`/settings/webhooks/${encodeURIComponent(endpoint.data.id)}/edit`}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          Edit
        </Link>
      </div>
      <p className="text-muted-foreground mb-6 text-sm">
        {endpoint.data.enabled ? 'Enabled' : 'Disabled'} ·{' '}
        {endpoint.data.eventTypes.length === 1
          ? '1 event'
          : `${endpoint.data.eventTypes.length} events`}{' '}
        · {endpoint.data.consecutiveFailures} consecutive failures
      </p>
      <div className="flex max-w-3xl flex-col gap-6">
        <section aria-label="Deliveries" className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">Deliveries</h2>
          {deliveries.error ? (
            <AppError
              title="Deliveries could not be loaded"
              error={deliveries.error}
              variant="banner"
            />
          ) : (
            <WebhookDeliveryTable deliveries={rows} />
          )}
        </section>
        <WebhookDeliveryManager deliveries={rows} />
      </div>
    </div>
  )
}
