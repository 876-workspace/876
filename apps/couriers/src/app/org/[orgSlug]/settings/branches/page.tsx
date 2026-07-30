import { Badge } from '@876/ui/badge'
import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'

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

  const branches = await service.branches.list({ tenantId: ctx.tenant.id })

  return (
    <Page>
      <PageBreadcrumb
        href={`/org/${orgSlug}/settings`}
        label="Settings"
        className="mb-4"
      />

      <PageHeader className="mb-8">
        <PageTitle>Locations & branches</PageTitle>
      </PageHeader>

      {branches.length === 0 ? (
        <div className="876-empty-dashed max-w-2xl">
          No branches yet. Add your organization address to seed one.
        </div>
      ) : (
        <ul className="max-w-2xl space-y-2">
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
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  {[branch.address?.line1, branch.address?.line2, branch.address?.city, branch.address?.regionName]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              </div>
              <span className="text-muted-foreground text-xs">
                {branch.address?.countryCode ?? branch.country}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Page>
  )
}
