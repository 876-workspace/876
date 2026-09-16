import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'

import { formatDay } from '../finance/format-money'
import type { IntegrationClient } from './types'

export type IntegrationClientListProps = {
  clients: readonly IntegrationClient[]
  revokeActionBase: string
  canEdit?: boolean
}

function trimBase(base: string): string {
  return base.replace(/\/+$/, '')
}

export function IntegrationClientList({
  clients,
  revokeActionBase,
  canEdit = false,
}: IntegrationClientListProps) {
  if (clients.length === 0) {
    return (
      <p className="text-muted-foreground py-12 text-center text-sm">
        No integration clients yet
      </p>
    )
  }

  return (
    <ul data-slot="integration-client-list" className="flex flex-col gap-2">
      {clients.map((client) => {
        const revoked = client.revokedAt !== null
        return (
          <li key={client.id} className="rounded-md border px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium">{client.name}</span>
              <Badge variant={revoked ? 'secondary' : 'outline'}>
                {revoked ? 'Revoked' : 'Active'}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {client.scopes.length === 0 ? (
                <span className="text-muted-foreground text-xs">No scopes</span>
              ) : (
                client.scopes.map((scope) => (
                  <Badge key={scope} variant="outline" className="font-mono text-xs">
                    {scope}
                  </Badge>
                ))
              )}
            </div>
            <p className="text-muted-foreground mt-2 text-xs">
              Last used{' '}
              {client.lastUsedAt === null ? (
                <span>—</span>
              ) : (
                <span>{formatDay(client.lastUsedAt)}</span>
              )}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Created {formatDay(client.createdAt)}
            </p>
            {revoked ? (
              <p className="text-muted-foreground mt-1 text-xs">
                Revoked {formatDay(client.revokedAt ?? 0)}
              </p>
            ) : canEdit ? (
              <form
                action={`${trimBase(revokeActionBase)}/${encodeURIComponent(client.id)}`}
                method="post"
                className="mt-3"
              >
                <Button type="submit" variant="outline">
                  Revoke
                </Button>
              </form>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
