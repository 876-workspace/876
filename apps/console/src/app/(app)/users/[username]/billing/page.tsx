import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Banknotes, Building2, ExternalLink } from '@876/ui/icons'

import { InvoicesView } from '@/components/patterns/detail/detail-views'
import { Panel, PanelEmpty } from '../_components/account/panel'
import { resolveUser, resolveUserMemberships } from '../_data'

type Props = { params: Promise<{ username: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const user = await resolveUser(username)
  if (!user) return { title: 'Billing' }

  const name =
    [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email
  return { title: `${name} • Billing - Users` }
}

/**
 * A person's billing, resolved by account shape.
 *
 * An enterprise member does **not** have invoices — their organization does. So
 * for a member this page links out to the organization's billing rather than
 * rendering the organization's money on a person's page, which is precisely the
 * confusion that makes it unclear who holds the contract.
 *
 * A consumer's own invoices come from their registry customer records
 * (`billing_customers`, one per organization they transact with) and render here.
 */
export default async function UserBillingPage({ params }: Props) {
  const { username } = await params
  const user = await resolveUser(username)
  if (!user) notFound()

  const memberships = await resolveUserMemberships(user.id)

  return (
    <div className="space-y-4">
      {memberships.length > 0 && (
        <Panel
          title="Organization billing"
          icon={Building2}
          tone="amber"
          count={memberships.length}
        >
          <ul className="divide-876-surface-border divide-y">
            {memberships.map(({ membership, org }) =>
              org ? (
                <li key={membership.id} className="py-2.5 first:pt-0 last:pb-0">
                  <Link
                    href={`/orgs/${org.slug}/billing`}
                    className="flex items-center gap-2 text-sm font-medium hover:underline"
                  >
                    <span className="truncate">{org.name ?? org.slug}</span>
                    <ExternalLink
                      aria-hidden="true"
                      className="text-muted-foreground size-3.5 shrink-0"
                    />
                  </Link>
                </li>
              ) : null
            )}
          </ul>
        </Panel>
      )}

      <Panel title="Personal invoices" icon={Banknotes} tone="violet">
        <InvoicesView subjectType="user" subjectId={user.id} />
        <PanelEmpty>No personal invoices</PanelEmpty>
      </Panel>
    </div>
  )
}
