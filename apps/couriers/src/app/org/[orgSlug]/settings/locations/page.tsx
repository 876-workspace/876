import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import Link from 'next/link'
import { after } from 'next/server'
import { Page, PageBreadcrumb } from '@876/ui/page'

import { ResourceToolbar } from '@/components/resource-toolbar'
import { formatAddressLine, needsRegionReview } from '@/lib/address/format'
import { getManageContext } from '@/lib/auth/manage-context'
import { service } from '@/lib/service'

export const metadata = { title: 'Locations — Settings' }

type Props = { params: Promise<{ orgSlug: string }> }

export default async function LocationsSettingsPage({ params }: Props) {
  const { orgSlug } = await params

  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant)
    return (
      <Page>
        <PageBreadcrumb
          href={`/org/${orgSlug}/settings`}
          label="Settings"
          className="mb-4"
        />
        <div className="876-empty-dashed max-w-2xl">
          We couldn&apos;t load this organization&apos;s branches. Please try
          again.
        </div>
      </Page>
    )

  const { id: tenantId, orgId } = ctx.tenant

  const branches = await service.branches.list({ tenantId })

  // Opportunistic repair for sites whose core mirror failed at write time. It
  // runs after the response so a slow identity API never delays this page.
  after(() => service.orgLocations.reconcile(tenantId, orgId))

  return (
    <Page>
      <PageBreadcrumb
        href={`/org/${orgSlug}/settings`}
        label="Settings"
        className="mb-4"
      />

      <ResourceToolbar
        title="Locations"
        primaryLabel="Add"
        primaryHref={`/org/${orgSlug}/settings/locations/new`}
        primaryVariant="info"
        refresh
      />

      {branches.length === 0 ? (
        <div className="876-empty-dashed max-w-2xl">No branches yet.</div>
      ) : (
        <ul className="max-w-3xl space-y-2">
          {branches.map((branch) => (
            <li
              key={branch.id}
              className="876-card flex items-start justify-between gap-4 p-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{branch.name}</span>
                  {branch.isDefault ? <Badge>Default</Badge> : null}
                  {branch.isActive ? null : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                  {needsRegionReview(branch.address) ? (
                    <Badge variant="secondary">Region needs review</Badge>
                  ) : null}
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  {formatAddressLine(branch.address)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-muted-foreground text-xs">
                  {branch.address.countryCode}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  render={
                    <Link
                      href={`/org/${orgSlug}/settings/locations/${branch.id}/edit`}
                    />
                  }
                >
                  Edit
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Page>
  )
}
