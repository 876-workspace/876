import { notFound } from 'next/navigation'
import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'

import { getManageContext } from '@/lib/auth/manage-context'
import { service } from '@/lib/service'

import { RoleForm } from '../role-form'

export const metadata = { title: 'Role — Settings' }

export default async function RolePage({
  params,
}: {
  params: Promise<{ orgSlug: string; roleId: string }>
}) {
  const { orgSlug, roleId } = await params
  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant) return null

  const role = await service.roles.retrieve(ctx.tenant.id, roleId)
  if (!role) notFound()

  return (
    <Page>
      <PageBreadcrumb
        href={`/org/${orgSlug}/settings/users/roles`}
        label="Roles"
        className="mb-4"
      />
      <PageHeader>
        <PageTitle>{role.name}</PageTitle>
      </PageHeader>
      <RoleForm orgSlug={orgSlug} role={role} />
    </Page>
  )
}
