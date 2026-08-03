import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page, PageBreadcrumb } from '@876/ui/page'

import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { Skeleton } from '@876/ui/skeleton'
import { getManageContext } from '@/lib/auth/manage-context'
import { service } from '@/lib/service'

import { RolesTable } from './_components/roles-table'
import { ROLES_SKELETON_COLUMNS } from './_components/roles-skeleton-columns'

export const metadata = { title: 'Roles — Settings' }

type Props = { params: Promise<{ orgSlug: string }> }

export default function RolesSettingsPage({ params }: Props) {
  return (
    <Page>
      <Suspense fallback={<Skeleton className="mb-4 h-5 w-16" />}>
        <RolesChrome params={params} />
      </Suspense>
      <Suspense
        fallback={<DataTableSkeleton columns={ROLES_SKELETON_COLUMNS} />}
      >
        <RolesData params={params} />
      </Suspense>
    </Page>
  )
}

async function RolesChrome({ params }: Props) {
  const { orgSlug } = await params
  return (
    <>
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
    </>
  )
}

async function RolesData({ params }: Props) {
  const { orgSlug } = await params
  const ctx = await getManageContext(orgSlug)

  if (!ctx?.tenant)
    return (
      <div className="876-empty-dashed max-w-2xl">
        We couldn&apos;t load this organization&apos;s roles. Please try again.
      </div>
    )

  await service.roles.ensureDefaults(ctx.tenant.id)
  const roles = await service.roles.list(ctx.tenant.id)

  return <RolesTable orgSlug={orgSlug} roles={roles} />
}
