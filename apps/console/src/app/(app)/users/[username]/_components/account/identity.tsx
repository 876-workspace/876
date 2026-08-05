import Link from 'next/link'
import type { AdminAccount, AdminUser, AdminUserApp } from '@876/admin'
import { OrgAvatar } from '@876/ui/org-avatar'
import { cn } from '@876/core/utils'

import type { UserOrgMembership } from '@/types/customer'
import { formatDate, statusBadgeClass } from '@/lib/format'
import { Fact, FactGrid, ProviderRow } from '../overview-ui'
import { PanelEmpty } from './panel'

/** The account's own facts — the fields that belong to the person, not to a relationship. */
export function IdentityFacts({ user }: { user: AdminUser }) {
  return (
    <FactGrid>
      <Fact label="Email" value={user.email} />
      <Fact
        label="Username"
        value={user.username ? `@${user.username}` : '—'}
      />
      <Fact
        label="Legal name"
        value={
          [user.first_name, user.middle_name, user.last_name]
            .filter(Boolean)
            .join(' ') || '—'
        }
      />
      <Fact label="Joined" value={formatDate(user.created_at)} />
      <Fact label="User ID" value={user.id} mono />
      <Fact label="WorkOS ID" value={user.workos_user_id} mono />
    </FactGrid>
  )
}

/**
 * How this person signs in — email/password plus every linked social provider.
 *
 * "They logged in through Google" is a credential fact, so it sits with the
 * account's security posture rather than in their profile: it is something an
 * agent acts on (unlink, force a reset), not something they read about a person.
 */
export function SignInMethods({ accounts }: { accounts: AdminAccount[] }) {
  if (accounts.length === 0)
    return <PanelEmpty>No sign-in methods on file</PanelEmpty>

  return (
    <ul className="space-y-2">
      {accounts.map((account) => (
        <ProviderRow key={account.id} account={account} />
      ))}
    </ul>
  )
}

/**
 * The organizations this person is a member of.
 *
 * Every row links out to `/orgs/[slug]`. Membership facts — role, status, when
 * they joined — live here; the organization's own contract, billing and
 * provisioning stay on the organization, because they belong to it and not to
 * whichever member you happen to be looking at.
 */
export function MembershipList({
  memberships,
}: {
  memberships: UserOrgMembership[]
}) {
  if (memberships.length === 0)
    return <PanelEmpty>Not a member of any organization</PanelEmpty>

  return (
    <ul className="divide-876-surface-border divide-y">
      {memberships.map(({ membership, org }) => (
        <li
          key={membership.id}
          className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
        >
          <OrgAvatar
            name={org?.name ?? null}
            src={org?.logo_url ?? null}
            size="sm"
            className="size-8 shrink-0 rounded-[7px] text-[0.625rem]"
          />

          <div className="min-w-0 flex-1">
            {org ? (
              <Link
                href={`/orgs/${org.slug}`}
                className="truncate text-sm font-medium hover:underline"
              >
                {org.name ?? org.slug}
              </Link>
            ) : (
              <span className="text-muted-foreground truncate text-sm italic">
                Unresolved organization
              </span>
            )}
            <p className="text-muted-foreground mt-0.5 truncate text-xs">
              {membership.role} · joined {formatDate(membership.created_at)}
            </p>
          </div>

          <span
            className={cn(
              'inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[0.6875rem] font-medium',
              statusBadgeClass(membership.status)
            )}
          >
            {membership.status}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** The 876 products this person has actually signed into, newest activity first. */
export function AppEnrollments({ apps }: { apps: AdminUserApp[] }) {
  if (apps.length === 0)
    return <PanelEmpty>No app sign-ins recorded</PanelEmpty>

  return (
    <ul className="divide-876-surface-border divide-y">
      {apps.map((app) => (
        <li
          key={app.id}
          className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
        >
          <OrgAvatar
            name={app.name}
            src={app.logo_url}
            size="sm"
            className="size-7 shrink-0 rounded-[6px] text-[0.5625rem]"
          />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {app.name}
          </span>
          <span className="text-muted-foreground shrink-0 text-xs">
            {formatDate(app.last_seen_at)}
          </span>
        </li>
      ))}
    </ul>
  )
}
