import 'server-only'

import { createDeliveriesResource } from './resources/deliveries'
import { createDomainsResource } from './resources/domains'
import { createSendersResource } from './resources/senders'
import { createTemplatesResource } from './resources/templates'
import { buildRuntime } from './runtime'
import type { ClientOptions } from './types'

export function create876CommunicationsClient(options: ClientOptions = {}) {
  const runtime = buildRuntime(options)
  return {
    domains: createDomainsResource(runtime),
    senders: createSendersResource(runtime),
    templates: createTemplatesResource(runtime),
    deliveries: createDeliveriesResource(runtime),
  }
}

export type CommunicationsClient = ReturnType<
  typeof create876CommunicationsClient
>
