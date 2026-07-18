import type { ReactNode } from 'react'
import Link from 'next/link'

import type { AdminOrganization } from '@876/admin'
import { Badge } from '@876/ui/badge'
import { Building2, ChevronRight, MapPin, Users } from '@876/ui/icons'
import type { IconComponent } from '@876/ui/icons'
import { Page, PageHeader, PageTitle } from '@876/ui/page'

import { ErrorState } from '@/components/enterprise/error-state'
import { getAdminClient } from '@/lib/auth/admin-client'
import { requireOrgPermission, requireSession } from '@/lib/auth/guards'

const DETAIL_PREVIEW_FIELDS: {
  key: keyof AdminOrganization
  label: string
}[] = [
  { key: 'name', label: 'Legal name' },
  { key: 'doing_business_as', label: 'Doing business as' },
  { key: 'industry', label: 'Industry' },
  { key: 'registration_number', label: 'Registration number' },
  { key: 'website_url', label: 'Website' },
  { key: 'timezone', label: 'Timezone' },
]

export default async function OrganizationOverviewPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const sessionUser = await requireSession(`/${slug}/organization`)
  const { membership } = await requireOrgPermission(
    sessionUser.id,
    slug,
    'org:read'
  )

  const orgId = membership.organization.id
  const client = await getAdminClient()
  const [orgResult, locationsResult, contactsResult] = await Promise.all([
    client.orgs.retrieve(orgId),
    client.orgs.locations.list(orgId),
    client.orgs.contacts.list(orgId),
  ])

  const locations = locationsResult.data?.data ?? []
  const contacts = contactsResult.data?.data ?? []

  return (
    <Page>
      <PageHeader>
        <PageTitle>Organization</PageTitle>
      </PageHeader>

      <div className="max-w-3xl space-y-5">
        <OverviewSection
          title="Company details"
          icon={Building2}
          href={`/${slug}/organization/details`}
        >
          {orgResult.error ? (
            <ErrorState error={orgResult.error} />
          ) : (
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {DETAIL_PREVIEW_FIELDS.map((field) => {
                const value = (orgResult.data[field.key] as string | null) ?? ''
                return (
                  <div key={field.key}>
                    <dt className="text-muted-foreground text-xs font-medium">
                      {field.label}
                    </dt>
                    <dd
                      className={
                        value
                          ? 'mt-0.5 text-sm'
                          : 'text-muted-foreground mt-0.5 text-sm'
                      }
                    >
                      {value || '—'}
                    </dd>
                  </div>
                )
              })}
            </dl>
          )}
        </OverviewSection>

        <OverviewSection
          title="Addresses"
          icon={MapPin}
          href={`/${slug}/locations`}
          count={locationsResult.error ? null : locations.length}
        >
          {locationsResult.error ? (
            <ErrorState error={locationsResult.error} />
          ) : locations.length === 0 ? (
            <p className="text-muted-foreground text-sm">No addresses</p>
          ) : (
            <ul className="space-y-2.5">
              {locations.slice(0, 3).map((location) => (
                <li key={location.id} className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium">{location.name}</span>
                    <span className="text-muted-foreground ml-2 truncate text-xs">
                      {[location.line1, location.city]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  </div>
                  {location.is_primary && (
                    <Badge variant="outline">Primary</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </OverviewSection>

        <OverviewSection
          title="Contacts"
          icon={Users}
          href={`/${slug}/organization/contacts`}
          count={contactsResult.error ? null : contacts.length}
        >
          {contactsResult.error ? (
            <ErrorState error={contactsResult.error} />
          ) : contacts.length === 0 ? (
            <p className="text-muted-foreground text-sm">No contacts</p>
          ) : (
            <ul className="space-y-2.5">
              {contacts.slice(0, 3).map((contact) => (
                <li key={contact.id} className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium">
                      {[contact.first_name, contact.last_name]
                        .filter(Boolean)
                        .join(' ')}
                    </span>
                    <span className="text-muted-foreground ml-2 text-xs capitalize">
                      {contact.type}
                    </span>
                  </div>
                  {contact.user_id && <Badge variant="outline">Member</Badge>}
                  {contact.is_primary && (
                    <Badge variant="outline">Primary</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </OverviewSection>
      </div>
    </Page>
  )
}

function OverviewSection({
  title,
  icon: Icon,
  href,
  count,
  children,
}: {
  title: string
  icon: IconComponent
  href: string
  count?: number | null
  children: ReactNode
}) {
  return (
    <section className="876-card">
      <div className="p-5">
        <h2 className="text-foreground mb-4 flex items-center gap-2 text-sm font-medium">
          <span className="bg-876-accent-surface text-876-accent-fg flex size-6 shrink-0 items-center justify-center rounded-md">
            <Icon aria-hidden="true" className="size-3.5" />
          </span>
          {title}
          {typeof count === 'number' && count > 0 && (
            <span className="text-muted-foreground font-normal">{count}</span>
          )}
        </h2>
        {children}
      </div>
      <Link
        href={href}
        className="text-876-accent-fg hover:bg-accent/40 flex items-center justify-between border-t px-5 py-3 text-sm font-medium transition-colors"
      >
        Manage
        <ChevronRight aria-hidden="true" className="size-4" />
      </Link>
    </section>
  )
}
