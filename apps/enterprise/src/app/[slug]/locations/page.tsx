import Link from 'next/link'

import { Badge } from '@876/ui/badge'
import { buttonVariants } from '@876/ui/button'
import { Empty, EmptyHeader, EmptyTitle } from '@876/ui/empty'
import { Plus } from '@876/ui/icons'
import { Page, PageHeader, PageTitle } from '@876/ui/page'

import { ErrorState } from '@/components/enterprise/error-state'
import { getAdminClient } from '@/lib/auth/admin-client'
import {
  hasOrgPermission,
  requireOrgPermission,
  requireSession,
} from '@/lib/auth/guards'

export default async function OrganizationLocationsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const sessionUser = await requireSession(`/${slug}/locations`)
  const { membership } = await requireOrgPermission(
    sessionUser.id,
    slug,
    'structure:read'
  )

  const canManage = hasOrgPermission(membership, 'structure:manage')

  const client = await getAdminClient()
  const locationsResult = await client.orgs.locations.list(
    membership.organization.id
  )
  const locations = locationsResult.data?.data ?? []

  return (
    <Page>
      <PageHeader className="flex items-center justify-between gap-4">
        <PageTitle>Locations</PageTitle>
        {canManage && (
          <Link
            href={`/${slug}/locations/new`}
            className={buttonVariants({ variant: 'info' })}
          >
            <Plus aria-hidden="true" className="size-3.5" />
            Add
          </Link>
        )}
      </PageHeader>

      {locationsResult.error ? (
        <ErrorState error={locationsResult.error} />
      ) : locations.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No locations</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {locations.map((location) => {
            const address = [
              location.line1,
              location.line2,
              location.city,
              location.postal_code,
              location.country_code,
            ]
              .filter(Boolean)
              .join(', ')

            const cardContent = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm font-medium">{location.name}</span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {location.is_primary && (
                      <Badge variant="outline">Primary</Badge>
                    )}
                    <Badge
                      variant={
                        location.status === 'active' ? 'success' : 'warning'
                      }
                    >
                      {location.status}
                    </Badge>
                  </div>
                </div>
                <div className="text-muted-foreground mt-2 space-y-0.5 text-xs">
                  <div className="capitalize">{location.type}</div>
                  <div className="truncate">{address || '—'}</div>
                  {location.phone && <div>{location.phone}</div>}
                  {location.email && <div>{location.email}</div>}
                </div>
              </>
            )

            return canManage ? (
              <Link
                key={location.id}
                href={`/${slug}/locations/${location.id}/edit`}
                className="876-card hover:border-876-accent-fg/30 block p-5 transition-colors"
              >
                {cardContent}
              </Link>
            ) : (
              <div key={location.id} className="876-card p-5">
                {cardContent}
              </div>
            )
          })}
        </div>
      )}
    </Page>
  )
}
