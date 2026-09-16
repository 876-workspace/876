import type {
  EmailDomain,
  EmailDomainStatus,
} from '@876/communications/contracts'
import { Badge } from '@876/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@876/ui/card'
import { Skeleton } from '@876/ui/skeleton'

export type DomainListPanelState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'error'; error: { code: string; message: string } }
  | { status: 'ready'; data: EmailDomain[] }

export interface DomainListPanelProps {
  state: DomainListPanelState
  baseHref: string
}

function statusBadgeVariant(status: EmailDomainStatus) {
  switch (status) {
    case 'not-started':
      return 'outline' as const
    case 'pending':
      return 'secondary' as const
    case 'partially-verified':
      return 'info' as const
    case 'partially-failed':
      return 'warning' as const
    case 'verified':
      return 'success' as const
    case 'failed':
      return 'destructive' as const
  }
}

function statusLabel(status: EmailDomainStatus) {
  switch (status) {
    case 'not-started':
      return 'Not started'
    case 'pending':
      return 'Pending'
    case 'partially-verified':
      return 'Partially verified'
    case 'partially-failed':
      return 'Partially failed'
    case 'verified':
      return 'Verified'
    case 'failed':
      return 'Failed'
  }
}

function statusHint(status: EmailDomainStatus) {
  switch (status) {
    case 'not-started':
      return 'Action needed — publish the DNS records.'
    case 'pending':
      return 'Verification in progress — wait.'
    case 'partially-verified':
      return 'Some records verified — check the rest.'
    case 'partially-failed':
      return 'Some records failed — check the values.'
    case 'verified':
      return 'Ready to send.'
    case 'failed':
      return 'Verification failed — check the values.'
  }
}

/** Sending domains with their verification status. */
export function DomainListPanel({ state, baseHref }: DomainListPanelProps) {
  return (
    <section aria-label="Sending domains">
      <Card>
        <CardHeader>
          <CardTitle>Sending domains</CardTitle>
        </CardHeader>
        <CardContent>
          {state.status === 'loading' ? (
            <div aria-label="Loading sending domains" className="space-y-3">
              {[0, 1, 2].map((index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : state.status === 'empty' ? (
            <p className="text-muted-foreground py-10 text-center text-sm">
              No sending domains yet.
            </p>
          ) : state.status === 'error' ? (
            <div
              role="alert"
              className="border-destructive/30 bg-destructive/5 rounded-lg border p-4 text-sm"
            >
              <p className="font-medium">Sending domains could not be loaded</p>
              <p className="text-muted-foreground mt-1">
                {state.error.message}
              </p>
              <p className="text-muted-foreground mt-2 font-mono text-xs">
                {state.error.code}
              </p>
            </div>
          ) : state.data.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center text-sm">
              No sending domains yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left">
                    <th scope="col" className="pr-4 pb-3 font-medium">
                      Domain
                    </th>
                    <th scope="col" className="pb-3 font-medium">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {state.data.map((domain) => (
                    <tr key={domain.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        <a
                          href={`${baseHref}/domains/${domain.id}`}
                          className="font-medium hover:underline"
                        >
                          {domain.name}
                        </a>
                        <span className="text-muted-foreground block text-xs">
                          {statusHint(domain.status)}
                        </span>
                      </td>
                      <td className="py-3">
                        <Badge variant={statusBadgeVariant(domain.status)}>
                          {statusLabel(domain.status)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

export function DomainListPanelSkeleton() {
  return (
    <section aria-label="Sending domains">
      <Card>
        <CardHeader>
          <CardTitle>Sending domains</CardTitle>
        </CardHeader>
        <CardContent>
          <div aria-label="Loading sending domains" className="space-y-3">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
