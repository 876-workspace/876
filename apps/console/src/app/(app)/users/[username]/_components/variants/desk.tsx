import type { ReactNode } from 'react'
import Link from 'next/link'
import type { IconComponent } from '@876/ui/icons'
import {
  Building2,
  Calendar,
  KeyRound,
  LifeBuoy,
  Link2,
  Mail,
  MailCheck,
  RectangleGroup,
} from '@876/ui/icons'
import { cn } from '@876/core/utils'

import type { UserViewData } from '../../_lib/view-data'
import { formatDate } from '@/lib/format'
import { accountShapeClass, accountShapeLabel } from '../../_lib/enforcement'
import { EnforcementTags } from '../account/enforcement-tags'
import { Panel } from '../account/panel'
import { RelationshipList } from '../account/relationships'
import { RequestList } from '../account/requests'
import {
  AppEnrollments,
  MembershipList,
  SignInMethods,
} from '../account/identity'

/**
 * Variant B — **Desk**.
 *
 * The agent posture, borrowed from Intercom and Zendesk: a narrow sticky rail
 * carrying who this person is and what standing they are in, and a wide column
 * where the *conversation* — their requests — is the primary object rather than
 * one section among many.
 *
 * This is the layout for "I am on the phone with them right now". The rail
 * answers "who am I talking to" without scrolling; everything scrollable is
 * history.
 */
export function DeskVariant({ data }: { data: UserViewData }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[19rem_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-4 lg:self-start">
        <div className="876-card space-y-4 p-4">
          <div>
            <span
              className={cn(
                'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
                accountShapeClass(data.shape)
              )}
            >
              {accountShapeLabel(data.shape)}
            </span>
          </div>

          <EnforcementTags tags={data.tags} size="sm" />

          <dl className="space-y-3">
            <RailFact
              icon={Mail}
              label="Email"
              value={data.user.email}
              trailing={
                data.user.email_verified ? (
                  <MailCheck
                    aria-label="Verified"
                    className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                  />
                ) : null
              }
            />
            {data.user.username && (
              <RailFact
                icon={KeyRound}
                label="Username"
                value={`@${data.user.username}`}
              />
            )}
            <RailFact
              icon={Calendar}
              label="Joined"
              value={formatDate(data.user.created_at)}
            />
            <RailFact
              icon={Link2}
              label="Relationships"
              value={`${data.relationships.length}`}
            />
            <RailFact
              icon={RectangleGroup}
              label="Apps used"
              value={`${data.apps.length}`}
            />
          </dl>

          {data.memberships.length > 0 && (
            <div className="border-876-surface-border border-t pt-3">
              <p className="text-muted-foreground mb-2 text-[0.6875rem] tracking-wide uppercase">
                Organizations
              </p>
              <ul className="space-y-1.5">
                {data.memberships.map(({ membership, org }) => (
                  <li key={membership.id} className="min-w-0">
                    {org ? (
                      <Link
                        href={`/orgs/${org.slug}`}
                        className="block truncate text-sm font-medium hover:underline"
                      >
                        {org.name ?? org.slug}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground truncate text-sm italic">
                        Unresolved
                      </span>
                    )}
                    <p className="text-muted-foreground truncate text-xs">
                      {membership.role}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </aside>

      <div className="min-w-0 space-y-4">
        <Panel
          title="Requests"
          icon={LifeBuoy}
          tone="rose"
          count={data.requests.length}
        >
          <RequestList requests={data.requests} />
        </Panel>

        <Panel
          title="Relationships"
          icon={Link2}
          tone="violet"
          count={data.relationships.length}
        >
          <RelationshipList relationships={data.relationships} />
        </Panel>

        <div className="grid gap-4 xl:grid-cols-2">
          <Panel
            title="Sign-in methods"
            icon={KeyRound}
            tone="indigo"
            count={data.accounts.length}
          >
            <SignInMethods accounts={data.accounts} />
          </Panel>

          <Panel
            title="Apps"
            icon={RectangleGroup}
            tone="sky"
            count={data.apps.length}
          >
            <AppEnrollments apps={data.apps} />
          </Panel>
        </div>

        {data.memberships.length > 0 && (
          <Panel
            title="Organizations"
            icon={Building2}
            tone="amber"
            count={data.memberships.length}
          >
            <MembershipList memberships={data.memberships} />
          </Panel>
        )}
      </div>
    </div>
  )
}

function RailFact({
  icon: Icon,
  label,
  value,
  trailing,
}: {
  icon: IconComponent
  label: string
  value: string
  trailing?: ReactNode
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon
        aria-hidden="true"
        className="text-muted-foreground mt-0.5 size-4 shrink-0"
      />
      <div className="min-w-0 flex-1">
        <dt className="text-muted-foreground text-[0.6875rem]">{label}</dt>
        <dd className="flex items-center gap-1.5 truncate text-sm">
          <span className="truncate">{value}</span>
          {trailing}
        </dd>
      </div>
    </div>
  )
}
