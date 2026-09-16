import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  createEmailDeliverySchema,
  emailDeliveryListSchema,
  emailDeliverySchema,
  type CreateEmailDeliveryInput,
  type ListEmailDeliveriesQuery,
  type RequestOptions,
} from '../types'

function root(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/email/deliveries`
}

function toQueryString(query: ListEmailDeliveriesQuery): string {
  const search = new URLSearchParams()
  if (query.limit !== undefined) search.set('limit', String(query.limit))
  const value = search.toString()
  return value ? `?${value}` : ''
}

export function createDeliveriesResource(runtime: Runtime) {
  return {
    list(
      organizationId: string,
      query: ListEmailDeliveriesQuery = {}
    ) {
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}${toQueryString(query)}`,
          signal: query.signal,
        },
        emailDeliveryListSchema
      )
    },
    create(
      organizationId: string,
      input: CreateEmailDeliveryInput,
      options: RequestOptions = {}
    ) {
      const parsed = createEmailDeliverySchema.parse(input)
      return request(
        runtime,
        {
          method: 'POST',
          path: root(organizationId),
          body: parsed,
          signal: options.signal,
          headers: options.actorId ? { 'x-actor-id': options.actorId } : undefined,
        },
        emailDeliverySchema
      )
    },
    retrieve(
      organizationId: string,
      deliveryId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}/${encodeURIComponent(deliveryId)}`,
          signal: options.signal,
        },
        emailDeliverySchema
      )
    },
  }
}
