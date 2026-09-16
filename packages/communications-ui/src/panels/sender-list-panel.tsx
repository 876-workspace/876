import type { EmailSender } from '@876/communications/contracts'
import { Badge } from '@876/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@876/ui/card'
import { Skeleton } from '@876/ui/skeleton'

export type SenderListPanelState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'error'; error: { code: string; message: string } }
  | { status: 'ready'; data: EmailSender[] }

export interface SenderListPanelProps {
  state: SenderListPanelState
  baseHref: string
}

/** Organization senders: name, address, kind, default and active flags. */
export function SenderListPanel({ state, baseHref }: SenderListPanelProps) {
  return (
    <section aria-label="Senders">
      <Card>
        <CardHeader>
          <CardTitle>Senders</CardTitle>
        </CardHeader>
        <CardContent>
          {state.status === 'loading' ? (
            <SenderListLoading />
          ) : state.status === 'empty' ? (
            <p className="text-muted-foreground py-10 text-center text-sm">
              No senders yet.
            </p>
          ) : state.status === 'error' ? (
            <div
              role="alert"
              className="border-destructive/30 bg-destructive/5 rounded-lg border p-4 text-sm"
            >
              <p className="font-medium">Senders could not be loaded</p>
              <p className="text-muted-foreground mt-1">
                {state.error.message}
              </p>
              <p className="text-muted-foreground mt-2 font-mono text-xs">
                {state.error.code}
              </p>
            </div>
          ) : state.data.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center text-sm">
              No senders yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left">
                    <th scope="col" className="pr-4 pb-3 font-medium">
                      Sender
                    </th>
                    <th scope="col" className="pr-4 pb-3 font-medium">
                      Kind
                    </th>
                    <th scope="col" className="pr-4 pb-3 font-medium">
                      Default
                    </th>
                    <th scope="col" className="pb-3 font-medium">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {state.data.map((sender) => (
                    <tr key={sender.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        <a
                          href={`${baseHref}/senders/${sender.id}`}
                          className="font-medium hover:underline"
                        >
                          {sender.name}
                        </a>
                        <span className="text-muted-foreground block text-xs">
                          {sender.email}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        {sender.kind === 'managed' ? (
                          <Badge variant="info">Managed</Badge>
                        ) : (
                          <Badge variant="outline">Custom domain</Badge>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        {sender.isDefault ? (
                          <Badge variant="secondary">Default</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3">
                        {sender.isActive ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
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

function SenderListLoading() {
  return (
    <div aria-label="Loading senders" className="space-y-3">
      {[0, 1, 2].map((index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
    </div>
  )
}

export function SenderListPanelSkeleton() {
  return (
    <section aria-label="Senders">
      <Card>
        <CardHeader>
          <CardTitle>Senders</CardTitle>
        </CardHeader>
        <CardContent>
          <SenderListLoading />
        </CardContent>
      </Card>
    </section>
  )
}
