import { notFound } from 'next/navigation'

import { WebhookDeliveryTable } from '@876/projects-ui/platform/webhook-delivery-table'
import { WebhookEndpointList } from '@876/projects-ui/platform/webhook-endpoint-list'
import { AppError } from '@876/ui/app-error'

import {
  toUiWebhookDelivery,
  toUiWebhookEndpoint,
} from '../projects-integration-mappers'
import { projects } from '@/lib/services/projects'

import { WebhookReplayButton } from './webhook-replay-button'

/**
 * The data half of the Webhook endpoint detail, shared by every host.
 * Read-only except for the operator replay action on failed deliveries,
 * which posts to the Console replay route (permission + audit enforced
 * there). Secrets are never fetched or rendered.
 */
export async function WebhookDetailData({
  organizationId,
  base,
  endpointId,
}: {
  organizationId: string
  /** The host's Projects root, e.g. `/projects` or `/workspace/acme/projects`. */
  base: string
  endpointId: string
}) {
  void base
  const decodedId = decodeURIComponent(endpointId)
  const [endpointResult, deliveriesResult] = await Promise.all([
    projects.webhookEndpoints.retrieve(decodedId),
    projects.webhookEndpoints.listDeliveries({
      endpointId: decodedId,
      limit: 50,
    }),
  ])

  if (endpointResult.error?.code === 'projects/webhook-endpoint-not-found')
    notFound()

  if (endpointResult.error || !endpointResult.data) {
    return (
      <AppError
        title="Webhook endpoint could not be loaded"
        error={endpointResult.error}
        variant="banner"
        showCode
      />
    )
  }

  const endpoint = toUiWebhookEndpoint(endpointResult.data)
  const deliveries = (deliveriesResult.data?.data ?? []).map(
    toUiWebhookDelivery
  )
  const failed = deliveries.filter((delivery) => delivery.status === 'failed')

  return (
    <div className="space-y-6">
      {deliveriesResult.error ? (
        <AppError
          title="Some webhook deliveries could not be loaded"
          error={deliveriesResult.error}
          variant="banner"
          showCode
        />
      ) : null}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Endpoint</h2>
        <WebhookEndpointList endpoints={[endpoint]} />
      </section>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Deliveries</h2>
        <WebhookDeliveryTable deliveries={deliveries} />
      </section>
      {failed.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Replay failed deliveries</h2>
          <ul className="space-y-2">
            {failed.map((delivery) => (
              <li
                key={delivery.id}
                className="flex flex-wrap items-center gap-3 rounded-md border px-4 py-3"
              >
                <span className="font-mono text-xs">{delivery.eventType}</span>
                <WebhookReplayButton
                  organizationId={organizationId}
                  deliveryId={delivery.id}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
