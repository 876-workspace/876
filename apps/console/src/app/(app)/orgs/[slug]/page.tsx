import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { cn } from '@876/core/utils'
import type { AdminSubscription } from '@876/admin'

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@876/ui/accordion'
import { AccordionGroup } from '@/components/detail/accordion-group'
import { Avatar, AvatarFallback, AvatarImage } from '@876/ui/avatar'
import { Building2, Home, Mail, LayoutDashboard, Users } from '@876/ui/icons'
import type { IconComponent } from '@876/ui/icons'
import { AnalyticsEvent } from '@/lib/analytics/events'
import { TrackMCEventOnMount } from '@/lib/analytics/track-event-on-mount'
import { $876 } from '@/lib/876'
import { formatDate, statusBadgeClass } from '@/lib/format'
import { resolveOrg, resolveOrgMembers } from './_data'
import { SubscriptionControls } from './subscription-controls'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) return { title: 'Organization not found' }
  return { title: `${org.name ?? org.slug} - Organizations` }
}

/** Soft per-section icon tints — distinct colors without leaning on brand green. */
const TONES = {
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
} as const
type Tone = keyof typeof TONES

function IconChip({
  icon: Icon,
  tone = 'blue',
  className,
}: {
  icon: IconComponent
  tone?: Tone
  className?: string
}) {
  return (
    <span
      className={cn(
        'flex size-7 shrink-0 items-center justify-center rounded-md',
        TONES[tone],
        className
      )}
    >
      <Icon aria-hidden="true" className="size-4" />
    </span>
  )
}

/** Subtle muted count pill, rendered only when there is something to count. */
function CountPill({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="bg-muted text-muted-foreground inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium">
      {count}
    </span>
  )
}

function AccordionCard({
  title,
  icon,
  tone,
  count,
  children,
}: {
  title: string
  icon: IconComponent
  tone?: Tone
  count?: number
  children: ReactNode
}) {
  const value = title.toLowerCase()
  return (
    <section className="876-card overflow-hidden rounded-lg">
      <AccordionItem value={value} className="border-b-0">
        <AccordionTrigger className="px-3 py-3 hover:no-underline">
          <span className="flex flex-1 items-center gap-2.5">
            <IconChip icon={icon} tone={tone} className="size-8" />
            <span className="text-sm font-semibold">{title}</span>
            {typeof count === 'number' && <CountPill count={count} />}
          </span>
        </AccordionTrigger>
        <AccordionContent className="px-3 pb-4">{children}</AccordionContent>
      </AccordionItem>
    </section>
  )
}

/** Responsive label-over-value grid for the detail cards. */
function FactGrid({ children }: { children: ReactNode }) {
  return <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">{children}</dl>
}

function Fact({
  label,
  value,
  mono,
}: {
  label: string
  value: ReactNode
  mono?: boolean
}) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className={cn('mt-1 truncate text-sm', mono && 'font-mono')}>
        {value}
      </dd>
    </div>
  )
}

function EmptyHint({ children }: { children: ReactNode }) {
  return (
    <p className="text-muted-foreground rounded-lg px-3 py-5 text-center text-sm">
      {children}
    </p>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-xs font-medium',
        statusBadgeClass(status)
      )}
    >
      {status}
    </span>
  )
}

export default async function OrganizationOverviewPage({ params }: Props) {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) notFound()

  const [membersResult, subscriptionsResult, productsResult, appsResult] =
    await Promise.all([
      resolveOrgMembers(org.id),
      $876.orgs.subscriptions.list(org.id),
      $876.products.list({ status: 'active' }),
      $876.apps.list({ appKind: 'internal', status: 'active', limit: 100 }),
    ])
  const memberships = membersResult?.data ?? []
  const subscriptions: AdminSubscription[] = subscriptionsResult.data ?? []
  // An app is org-gated (subscribable) iff it has at least one active product —
  // the three default identity surfaces (876, Enterprise, Console) have none.
  const gatedAppIds = new Set(
    (productsResult.data?.data ?? [])
      .map((product) => product.app_id)
      .filter((appId): appId is string => appId !== null)
  )
  const provisionableApps = (appsResult.data?.data ?? [])
    .filter((app) => gatedAppIds.has(app.id))
    .map((app) => ({ slug: app.slug, label: app.name }))
    .sort((a, b) => a.label.localeCompare(b.label))
  const userResults = await Promise.all(
    memberships.map((membership) => $876.users.retrieve(membership.user_id))
  )
  const usersById = Object.fromEntries(
    userResults.flatMap((result) =>
      result.data ? [[result.data.id, result.data]] : []
    )
  )

  const hasContact =
    org.primary_email || org.primary_phone || org.website_url || org.support_url
  const hasAddress =
    org.address_line1 ||
    org.address_line2 ||
    org.city ||
    org.region_id ||
    org.country_code

  return (
    <>
      <TrackMCEventOnMount
        event={AnalyticsEvent.OrgDetailViewed}
        properties={{ org_id: org.id }}
      />

      <div className="grid gap-6 lg:grid-cols-[30%_1fr]">
        <div className="min-w-0 space-y-3">
          <AccordionGroup>
            <AccordionCard title="Organization" icon={Building2} tone="blue">
              <FactGrid>
                <Fact label="Name" value={org.name || '—'} />
                <Fact label="Short name" value={org.short_name || '—'} />
                <Fact label="Slug" value={org.slug} mono />
                <Fact
                  label="Status"
                  value={<StatusBadge status={org.status} />}
                />
                <Fact
                  label="Currency"
                  value={org.currency_code?.toUpperCase() || '—'}
                />
                <Fact
                  label="WorkOS ID"
                  value={org.workos_organization_id || '—'}
                  mono
                />
                <Fact label="Platform ID" value={org.id} mono />
                <Fact label="Created" value={formatDate(org.created_at)} />
                <Fact label="Last updated" value={formatDate(org.updated_at)} />
                {org.enrollment_completed_at && (
                  <Fact
                    label="Enrollment completed"
                    value={formatDate(org.enrollment_completed_at)}
                  />
                )}
              </FactGrid>
            </AccordionCard>

            <AccordionCard title="Contact" icon={Mail} tone="sky">
              {!hasContact ? (
                <EmptyHint>No contact details.</EmptyHint>
              ) : (
                <FactGrid>
                  <Fact label="Email" value={org.primary_email || '—'} />
                  <Fact label="Phone" value={org.primary_phone || '—'} />
                  <Fact label="Website" value={org.website_url || '—'} />
                  <Fact label="Support URL" value={org.support_url || '—'} />
                </FactGrid>
              )}
            </AccordionCard>

            <AccordionCard title="Address" icon={Home} tone="rose">
              {!hasAddress ? (
                <EmptyHint>No address on file.</EmptyHint>
              ) : (
                <FactGrid>
                  <Fact label="Line 1" value={org.address_line1 || '—'} />
                  {org.address_line2 && (
                    <Fact label="Line 2" value={org.address_line2} />
                  )}
                  <Fact label="City" value={org.city || '—'} />
                  <Fact label="Region" value={org.region_id || '—'} />
                  <Fact
                    label="Country"
                    value={org.country_code?.toUpperCase() || '—'}
                  />
                </FactGrid>
              )}
            </AccordionCard>

            <AccordionCard
              title="Platform Apps"
              icon={LayoutDashboard}
              tone="violet"
              count={subscriptions.filter((a) => a.status === 'active').length}
            >
              {provisionableApps.length === 0 ? (
                <EmptyHint>No org-gated apps registered.</EmptyHint>
              ) : (
                <SubscriptionControls
                  orgId={org.id}
                  access={subscriptions}
                  apps={provisionableApps}
                />
              )}
            </AccordionCard>

            <AccordionCard
              title="Members"
              icon={Users}
              tone="indigo"
              count={memberships.length}
            >
              {memberships.length === 0 ? (
                <EmptyHint>No members.</EmptyHint>
              ) : (
                <ul className="space-y-3">
                  {memberships.map((membership) => {
                    const user = usersById[membership.user_id]
                    const name = user
                      ? [user.first_name, user.last_name]
                          .filter(Boolean)
                          .join(' ') || user.email
                      : membership.user_id
                    const initials = name
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part[0]?.toUpperCase())
                      .join('')

                    return (
                      <li
                        key={membership.id}
                        className="flex items-center gap-3"
                      >
                        <Avatar className="size-8 text-xs">
                          {user?.avatar && (
                            <AvatarImage src={user.avatar} alt={name} />
                          )}
                          <AvatarFallback>{initials || '?'}</AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {name}
                          </span>
                          <span className="text-muted-foreground block truncate text-xs capitalize">
                            {membership.role}
                          </span>
                        </span>
                        <StatusBadge status={membership.status} />
                      </li>
                    )
                  })}
                </ul>
              )}
            </AccordionCard>
          </AccordionGroup>
        </div>

        <aside className="hidden lg:block">
          <div className="876-card flex h-full min-h-48 flex-col items-center justify-center border-dashed p-6 text-center">
            <p className="text-muted-foreground text-sm font-medium">
              Reserved
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Insights and activity for this organization will appear here.
            </p>
          </div>
        </aside>
      </div>
    </>
  )
}
