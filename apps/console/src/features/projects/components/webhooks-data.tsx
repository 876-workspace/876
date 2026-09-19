import Link from 'next/link'

import { WebhookDeliveryTable } from '@876/projects-ui/platform/webhook-delivery-table'
import { WebhookEndpointList } from '@876/projects-ui/platform/webhook-endpoint-list'
import { AppError } from '@876/ui/app-error'

import {
  toUiWebhookDelivery,
  toUiWebhookEndpoint,
} from '../projects-integration-mappers'
import { projects } from '@/lib/clients/projects'

/**
 * The data half of the Webhooks list, shared by every host.
 * Read-only: endpoint URLs, event types, and delivery history. Endpoint
 * secrets are never fetched — only the signed/unsigned presence flag renders.
 */
export async function WebhooksData({
  organizationId,
  base,
}: {
  organizationId: string
  /** The host's Projects root, e.g. `/projects` or `/workspace/acme/projects`. */
  base: string
}) {
  void organizationId
  const [endpointsResult, deliveriesResult] = await Promise.all([
    projects.webhookEndpoints.list(),
    projects.webhookEndpoints.listDeliveries({ limit: 50 }),
  ])

  const endpoints = (endpointsResult.data?.data ?? []).map(toUiWebhookEndpoint)
  const deliveries = (deliveriesResult.data?.data ?? []).map(
    toUiWebhookDelivery
  )
  const loadError = endpointsResult.error ?? deliveriesResult.error

  return (
    <div className="space-y-6">
      {loadError ? (
        <AppError
          title="Webhook data could not be loaded"
          error={loadError}
          variant="banner"
          showCode
        />
      ) : null}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Endpoints</h2>
        <WebhookEndpointList endpoints={endpoints} />
        {endpoints.length > 0 ? (
          <ul className="space-y-1">
            {endpoints.map((endpoint) => (
              <li key={endpoint.id}>
                <Link
                  className="text-sm underline"
                  href={`${base}/webhooks/${encodeURIComponent(endpoint.id)}`}
                >
                  View deliveries for {endpoint.url}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Recent deliveries</h2>
        <WebhookDeliveryTable deliveries={deliveries} />
      </section>
    </div>
  )
}
