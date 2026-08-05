import { cn } from '@876/core/utils'

import type {
  RequestClass,
  RequestState,
  UserRequestSummary,
} from '@/types/customer'
import { formatDate } from '@/lib/format'
import { PanelEmpty } from './panel'

/**
 * The person's 876 Desk requests — support and disputes in one list.
 *
 * They share a list because they are one object with different counterparties,
 * the PayPal shape: a **support** request is against 876, a **dispute** is
 * against an organization and we are not a party to it until somebody escalates.
 * Splitting them into two products would mean two inboxes for the same agent.
 */
export function RequestList({
  requests,
  dense,
}: {
  requests: UserRequestSummary[]
  dense?: boolean
}) {
  if (requests.length === 0) return <PanelEmpty>No open requests</PanelEmpty>

  return (
    <ul className="divide-876-surface-border divide-y">
      {requests.map((request) => (
        <li
          key={request.id}
          className={cn(
            'flex items-start gap-3 first:pt-0 last:pb-0',
            dense ? 'py-2.5' : 'py-3'
          )}
        >
          <span
            className={cn(
              'mt-0.5 inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[0.6875rem] font-medium',
              requestClassClass(request.class)
            )}
          >
            {request.class}
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{request.subject}</p>
            <p className="text-muted-foreground mt-0.5 truncate text-xs">
              {request.appName}
              {request.orgName && ` · against ${request.orgName}`} ·{' '}
              {formatDate(request.createdAt)}
            </p>
          </div>

          <span
            className={cn(
              'inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[0.6875rem] font-medium',
              requestStateClass(request.state)
            )}
          >
            {request.state}
          </span>
        </li>
      ))}
    </ul>
  )
}

function requestClassClass(value: RequestClass): string {
  return value === 'dispute'
    ? 'border-rose-400/40 bg-rose-400/10 text-rose-700 dark:text-rose-400'
    : 'border-sky-400/40 bg-sky-400/10 text-sky-700 dark:text-sky-400'
}

/**
 * `escalated` is amber and loud on purpose — that is the state where 876 has
 * become a party to somebody else's argument and owes a decision.
 */
function requestStateClass(value: RequestState): string {
  switch (value) {
    case 'escalated':
      return 'border-amber-400/40 bg-amber-400/10 text-amber-700 dark:text-amber-400'
    case 'open':
    case 'pending':
      return 'border-blue-400/40 bg-blue-400/10 text-blue-700 dark:text-blue-400'
    default:
      return 'border-border bg-muted/50 text-muted-foreground'
  }
}
