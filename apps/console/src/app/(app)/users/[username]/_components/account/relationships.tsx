import Link from 'next/link'
import { OrgAvatar } from '@876/ui/org-avatar'
import { cn } from '@876/core/utils'

import type { UserRelationship } from '@/types/customer'
import { statusBadgeClass } from '@/lib/format'
import { formatMoney } from '../../_lib/money'
import { PanelEmpty } from './panel'

/**
 * The person's (organization × app) relationships.
 *
 * This list is the reason the user page has to be Console's front door: a
 * consumer holds a *different* profile with every courier they ship through —
 * one mailbox with Speedy Shipping, another with IslandWide — and no single
 * organization page can show that set. It lives on the person.
 *
 * Rows are read-only here. The app that owns the profile owns editing it;
 * Console links out rather than reaching across a bounded context.
 */
export function RelationshipList({
  relationships,
  dense,
}: {
  relationships: UserRelationship[]
  dense?: boolean
}) {
  if (relationships.length === 0)
    return <PanelEmpty>No linked organizations yet</PanelEmpty>

  return (
    <ul className="divide-876-surface-border divide-y">
      {relationships.map((relationship) => (
        <RelationshipRow
          key={relationship.key}
          relationship={relationship}
          dense={dense}
        />
      ))}
    </ul>
  )
}

function RelationshipRow({
  relationship,
  dense,
}: {
  relationship: UserRelationship
  dense?: boolean
}) {
  return (
    <li
      className={cn(
        'flex items-center gap-3 first:pt-0 last:pb-0',
        dense ? 'py-2.5' : 'py-3'
      )}
    >
      <OrgAvatar
        name={relationship.orgName}
        src={relationship.orgLogoUrl}
        size="sm"
        className="size-8 shrink-0 rounded-[7px] text-[0.625rem]"
      />

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          {/* Tier 1: the row subject is the organization this profile is with. */}
          <Link
            href={`/orgs/${relationship.orgSlug}`}
            className="truncate text-sm font-medium hover:underline"
          >
            {relationship.orgName}
          </Link>
          <span
            className={cn(
              'inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[0.6875rem] font-medium',
              statusBadgeClass(relationship.status)
            )}
          >
            {relationship.status}
          </span>
        </div>

        {/* Tier 3: the app and the app's own handle for this person. */}
        <p className="text-muted-foreground mt-0.5 truncate text-xs">
          {relationship.appName}
          {relationship.profileLabel && ` · ${relationship.profileLabel}`}
          {relationship.profileDetail && ` · ${relationship.profileDetail}`}
        </p>
      </div>

      <div className="shrink-0 text-right">
        {relationship.lifetimePaid && (
          <p className="text-sm font-medium tabular-nums">
            {formatMoney(relationship.lifetimePaid)}
          </p>
        )}
        {relationship.openRequests > 0 && (
          <p className="text-muted-foreground text-xs tabular-nums">
            {relationship.openRequests} open
          </p>
        )}
      </div>
    </li>
  )
}
