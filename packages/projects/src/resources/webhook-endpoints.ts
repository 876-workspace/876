import {
  integrationRequest,
  type IntegrationRuntime,
} from '../integration-request'
import {
  webhookDeliveryListSchema,
  webhookDeliverySchema,
  webhookEndpointListSchema,
  webhookEndpointSchema,
  deletedSchema,
  type CreateWebhookEndpointInput,
  type IntegrationRequestOptions,
  type ListWebhookDeliveriesQuery,
  type ReplayWebhookDeliveryInput,
  type UpdateWebhookEndpointInput,
} from '../integration-schemas'

function root() {
  return '/v1/integration/webhook-endpoints'
}

function deliveriesQuery(query: ListWebhookDeliveriesQuery): string {
  const search = new URLSearchParams()
  if (query.endpointId) search.set('endpointId', query.endpointId)
  if (query.status) search.set('status', query.status)
  if (query.limit !== undefined) search.set('limit', String(query.limit))
  const suffix = search.toString()
  return suffix ? `?${suffix}` : ''
}

export function createWebhookEndpointsResource(runtime: IntegrationRuntime) {
  return {
    list(options: IntegrationRequestOptions = {}) {
      return integrationRequest(
        runtime,
        'bearer',
        { method: 'GET', path: root(), signal: options.signal },
        webhookEndpointListSchema
      )
    },
    create(
      input: CreateWebhookEndpointInput,
      options: IntegrationRequestOptions = {}
    ) {
      return integrationRequest(
        runtime,
        'bearer',
        { method: 'POST', path: root(), body: input, signal: options.signal },
        webhookEndpointSchema
      )
    },
    retrieve(endpointId: string, options: IntegrationRequestOptions = {}) {
      return integrationRequest(
        runtime,
        'bearer',
        {
          method: 'GET',
          path: `${root()}/${encodeURIComponent(endpointId)}`,
          signal: options.signal,
        },
        webhookEndpointSchema
      )
    },
    update(
      endpointId: string,
      input: UpdateWebhookEndpointInput,
      options: IntegrationRequestOptions = {}
    ) {
      return integrationRequest(
        runtime,
        'bearer',
        {
          method: 'PATCH',
          path: `${root()}/${encodeURIComponent(endpointId)}`,
          body: input,
          signal: options.signal,
        },
        webhookEndpointSchema
      )
    },
    remove(endpointId: string, options: IntegrationRequestOptions = {}) {
      return integrationRequest(
        runtime,
        'bearer',
        {
          method: 'DELETE',
          path: `${root()}/${encodeURIComponent(endpointId)}`,
          signal: options.signal,
        },
        deletedSchema
      )
    },
    listDeliveries(
      query: ListWebhookDeliveriesQuery & IntegrationRequestOptions = {}
    ) {
      const { signal, ...filters } = query
      return integrationRequest(
        runtime,
        'bearer',
        {
          method: 'GET',
          path: `/v1/integration/webhook-deliveries${deliveriesQuery(filters)}`,
          signal,
        },
        webhookDeliveryListSchema
      )
    },
    replay(
      deliveryId: string,
      input: ReplayWebhookDeliveryInput,
      options: IntegrationRequestOptions = {}
    ) {
      return integrationRequest(
        runtime,
        'internal',
        {
          method: 'POST',
          path: `/internal/webhook-deliveries/${encodeURIComponent(deliveryId)}/replay`,
          body: input,
          signal: options.signal,
        },
        webhookDeliverySchema
      )
    },
  }
}
