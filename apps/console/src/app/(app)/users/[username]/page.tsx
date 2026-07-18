import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AccordionGroup } from '@/components/detail/accordion-group'
import { AppWindow, Fingerprint, Home, ShieldCheck, Users } from '@876/ui/icons'
import { AnalyticsEvent } from '@/lib/analytics/events'
import { TrackMCEventOnMount } from '@/lib/analytics/track-event-on-mount'
import { AccountFactsPanel } from './account-facts-panel'
import { AppIdentitiesPanel, appIdentityCount } from './app-identities-panel'
import { AddressOverviewList } from './addresses/address-overview-list'
import { ContactAccordion } from './contacts-accordion'
import { EmptyHint } from './overview-ui'
import { LazyAuthAccounts } from './overview-lazy'
import { AccordionCard, ViewAllLink } from './overview-accordion-card'
import {
  resolveUser,
  resolveUserAddresses,
  resolveUserApps,
  resolveUserContacts,
  resolveUserMcRole,
  resolveUserMembershipCount,
} from './_data'

type Props = { params: Promise<{ username: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const user = await resolveUser(username)
  if (!user) return { title: 'User not found' }
  const name =
    [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email
  return { title: `${name} - Users` }
}

/** Cap on items rendered in an overview accordion before "View all". */
const OVERVIEW_PREVIEW_LIMIT = 3

export default async function UserOverviewPage({ params }: Props) {
  const { username } = await params
  const user = await resolveUser(username)
  if (!user) notFound()
  // Eager load is intentionally minimal: the user record (header/identity) plus
  // the cheap counts for the accordion shells. Each accordion body — profile,
  // sign-in methods, org details — fetches lazily when its panel first opens.
  const [addresses, contacts, membershipCount, mcRole, enrolledApps] =
    await Promise.all([
      resolveUserAddresses(user.id),
      resolveUserContacts(user.id),
      resolveUserMembershipCount(user.id),
      resolveUserMcRole(user.id),
      resolveUserApps(user.id),
    ])

  return (
    <>
      <TrackMCEventOnMount
        event={AnalyticsEvent.UserDetailViewed}
        properties={{ viewed_user_id: user.id }}
      />
      <div className="grid gap-6 lg:grid-cols-[30%_1fr]">
        <div className="min-w-0 space-y-3">
          <AccordionGroup>
            <AccordionCard title="Account" icon={Fingerprint} tone="blue">
              <AccountFactsPanel user={user} />
            </AccordionCard>

            <AccordionCard
              title="Addresses"
              icon={Home}
              tone="rose"
              count={addresses.length}
              addHref={`/users/${username}/addresses/new`}
            >
              {addresses.length === 0 ? (
                <EmptyHint>No saved addresses.</EmptyHint>
              ) : (
                <>
                  <AddressOverviewList
                    addresses={addresses.slice(0, OVERVIEW_PREVIEW_LIMIT)}
                  />
                  {addresses.length > OVERVIEW_PREVIEW_LIMIT && (
                    <ViewAllLink href={`/users/${username}/addresses`} />
                  )}
                </>
              )}
            </AccordionCard>

            <AccordionCard
              title="Contacts"
              icon={Users}
              tone="sky"
              count={contacts.length}
              addHref={`/users/${username}/contacts/new`}
            >
              {contacts.length === 0 ? (
                <EmptyHint>No saved contacts.</EmptyHint>
              ) : (
                <>
                  <ContactAccordion
                    contacts={contacts.slice(0, OVERVIEW_PREVIEW_LIMIT)}
                  />
                  {contacts.length > OVERVIEW_PREVIEW_LIMIT && (
                    <ViewAllLink href={`/users/${username}/contacts`} />
                  )}
                </>
              )}
            </AccordionCard>

            <AccordionCard
              title="Apps"
              icon={AppWindow}
              tone="indigo"
              count={appIdentityCount(mcRole, membershipCount, enrolledApps)}
            >
              <AppIdentitiesPanel
                user={user}
                membershipCount={membershipCount}
                mcRole={mcRole}
                enrolledApps={enrolledApps}
              />
            </AccordionCard>

            <AccordionCard
              title="Authentication"
              icon={ShieldCheck}
              tone="violet"
            >
              <LazyAuthAccounts
                userId={user.id}
                emailVerified={user.email_verified}
              />
            </AccordionCard>
          </AccordionGroup>
        </div>

        <aside className="hidden lg:block">
          <div className="876-card flex h-full min-h-48 flex-col items-center justify-center border-dashed p-6 text-center">
            <p className="text-muted-foreground text-sm font-medium">
              Reserved
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Insights and activity for this user will appear here.
            </p>
          </div>
        </aside>
      </div>
    </>
  )
}
