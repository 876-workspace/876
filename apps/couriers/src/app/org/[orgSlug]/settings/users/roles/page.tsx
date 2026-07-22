import { Page, PageBreadcrumb } from '@876/ui/page'

import { ResourceToolbar } from '@/components/resource-toolbar'
import { getManageContext } from '@/lib/auth/manage-context'
import { service } from '@/lib/service'

import { RolesTable } from './roles-table'

export const metadata = { title: 'Roles — Settings' }

export default async function RolesSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  const ctx = await getManageContext(orgSlug)

  if (!ctx?.tenant)
    return (
      <Page>
        <PageBreadcrumb
          href={`/org/${orgSlug}/settings/users`}
          label="Users"
          className="mb-4"
        />
        <div className="876-empty-dashed max-w-2xl">
          We couldn&apos;t load this organization&apos;s roles. Please try
          again.
        </div>
      </Page>
    )

  await service.roles.ensureDefaults(ctx.tenant.id)
  const roles = await service.roles.list(ctx.tenant.id)

  return (
    <Page>
      <PageBreadcrumb
        href={`/org/${orgSlug}/settings/users`}
        label="Users"
        className="mb-4"
      />
      <ResourceToolbar
        title="Roles"
        primaryLabel="Add"
        primaryVariant="info"
        primaryHref={`/org/${orgSlug}/settings/users/roles/new`}
        refresh
      />
      <RolesTable orgSlug={orgSlug} roles={roles} />
    </Page>
  )
}
