import { Badge } from '@876/ui/badge'

import type { WebhookEndpoint } from './types'

export type WebhookEndpointListProps = {
  endpoints: readonly WebhookEndpoint[]
}

export function WebhookEndpointList({ endpoints }: WebhookEndpointListProps) {
  if (endpoints.length === 0) {
    return (
      <p className="text-muted-foreground py-12 text-center text-sm">
        No webhook endpoints yet
      </p>
    )
  }

  return (
    <ul data-slot="webhook-endpoint-list" className="flex flex-col gap-2">
      {endpoints.map((endpoint) => (
        <li key={endpoint.id} className="rounded-md border px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="min-w-0 flex-1 font-mono text-xs break-all">
              {endpoint.url}
            </span>
            <Badge variant={endpoint.enabled ? 'success' : 'secondary'}>
              {endpoint.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-2 text-xs">
            {endpoint.eventTypes.length === 1
              ? '1 event'
              : `${endpoint.eventTypes.length} events`}
            {endpoint.hasSecret ? ' · Signed' : ' · Unsigned'}
          </p>
          <p className="mt-1 text-xs">
            <span className="text-muted-foreground">Consecutive failures </span>
            <span
              className={
                endpoint.consecutiveFailures >= 5
                  ? 'text-destructive font-semibold tabular-nums'
                  : 'text-muted-foreground tabular-nums'
              }
              data-slot={
                endpoint.consecutiveFailures >= 5
                  ? 'endpoint-failing'
                  : 'endpoint-failures'
              }
            >
              {endpoint.consecutiveFailures}
            </span>
          </p>
        </li>
      ))}
    </ul>
  )
}
