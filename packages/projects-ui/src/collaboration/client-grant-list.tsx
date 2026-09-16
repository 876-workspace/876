import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'

import { formatDay } from '../finance/format-money'
import type { ClientGrant } from './types'

type ClientGrantListProps = {
  grants: readonly ClientGrant[]
  revokeActionBase: string
}

export function ClientGrantList({
  grants,
  revokeActionBase,
}: ClientGrantListProps) {
  if (grants.length === 0) {
    return (
      <p className="text-muted-foreground py-12 text-center text-sm">
        No client grants yet
      </p>
    )
  }

  return (
    <ul data-slot="client-grant-list" className="flex flex-col gap-2">
      {grants.map((grant) => (
        <li key={grant.id} className="rounded-md border px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium">{grant.userLabel}</span>
            <Badge variant="outline">
              {grant.revokedAt === null ? 'Active' : 'Revoked'}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-2 text-xs">
            Invited {formatDay(grant.invitedAt)}
          </p>
          {grant.revokedAt !== null ? (
            <p className="text-muted-foreground mt-1 text-xs">
              Revoked {formatDay(grant.revokedAt)}
            </p>
          ) : (
            <form
              action={`${revokeActionBase.replace(/\/+$/, '')}/${encodeURIComponent(grant.id)}`}
              method="post"
              className="mt-3"
            >
              <Button type="submit" variant="outline">
                Revoke
              </Button>
            </form>
          )}
        </li>
      ))}
    </ul>
  )
}
