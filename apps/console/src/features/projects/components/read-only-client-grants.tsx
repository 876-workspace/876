import { Badge } from '@876/ui/badge'

import { formatDay } from '@876/projects-ui/finance/format-money'
import type { ClientGrant } from '@876/projects-ui/collaboration/types'

/**
 * Read-only Console variant of the shared `ClientGrantList`.
 *
 * The shared list requires a `revokeActionBase` form target, which Console
 * never provides (operator surface is read-only). This renders the same grant
 * rows without revoke forms.
 */
export function ReadOnlyClientGrantList({
  grants,
}: {
  grants: readonly ClientGrant[]
}) {
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
          ) : null}
        </li>
      ))}
    </ul>
  )
}
