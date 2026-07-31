import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { Page, PageBreadcrumb } from '@876/ui/page'
import Link from 'next/link'

import { ResourceToolbar } from '@/components/resource-toolbar'
import { formatAddressLine, needsRegionReview } from '@/lib/address/format'
import { getManageContext } from '@/lib/auth/manage-context'
import { service } from '@/lib/service'

export const metadata = { title: 'Locations & branches — Settings' }

type Props = { params: Promise<{ orgSlug: string }> }

export default async function BranchesSettingsPage({ params }: Props) {
  const { orgSlug } = await params

  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant)
    return (
      <Page>
        <div className="876-empty-dashed max-w-2xl">
          We couldn&apos;t load this organization&apos;s branches. Please try
          again.
        </div>
      </Page>
    )

  const [branches, warehouses] = await Promise.all([
    service.branches.list({ tenantId: ctx.tenant.id }),
    service.warehouses.list({ tenantId: ctx.tenant.id }),
  ])

  return (
    <Page>
      <PageBreadcrumb
        href={`/org/${orgSlug}/settings`}
        label="Settings"
        className="mb-4"
      />

      <ResourceToolbar
        title="Locations & branches"
        primaryLabel="Add"
        primaryHref={`/org/${orgSlug}/settings/branches/new`}
        primaryVariant="info"
        refresh
      />

      {branches.length === 0 ? (
        <div className="876-empty-dashed max-w-2xl">
          No branches yet. Add the location customers collect packages from.
        </div>
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
                      href={`/org/${orgSlug}/settings/branches/${branch.id}/edit`}
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

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium">Warehouses</h2>

        {warehouses.length === 0 ? (
          <div className="876-empty-dashed max-w-2xl">
            No warehouses yet. Add the address customers ship their overseas
            purchases to.
          </div>
        ) : (
          <ul className="max-w-3xl space-y-2">
            {warehouses.map((warehouse) => (
              <li
                key={warehouse.id}
                className="876-card flex items-start justify-between gap-4 p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{warehouse.name}</span>
                    {warehouse.isPrimary ? <Badge>Primary</Badge> : null}
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {formatAddressLine(warehouse.address)}
                  </p>
                </div>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {warehouse.address.countryCode}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Page>
  )
}
