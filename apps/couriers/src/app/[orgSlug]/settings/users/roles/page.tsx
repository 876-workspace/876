import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { getManageContext } from '@/lib/auth/manage-context'
import { service } from '@/lib/service'

import { RolesShell } from './_components/roles-shell'
import { RolesTable } from './_components/roles-table'
import { ROLES_SKELETON_COLUMNS } from './_components/roles-skeleton-columns'

export const metadata = { title: 'Roles — Settings' }

type Props = { params: Promise<{ orgSlug: string }> }

export default async function RolesSettingsPage({ params }: Props) {
  const { orgSlug } = await params

  return (
    <Page>
      <RolesShell orgSlug={orgSlug} />
      <Suspense
        fallback={<DataTableSkeleton columns={ROLES_SKELETON_COLUMNS} />}
      >
        <RolesData params={params} />
      </Suspense>
    </Page>
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
