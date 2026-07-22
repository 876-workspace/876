import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'

import { getManageContext } from '@/lib/auth/manage-context'

import { RoleForm } from '../role-form'

export const metadata = { title: 'Add role — Settings' }

export default async function NewRolePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant) return null

  return (
    <Page>
      <PageBreadcrumb
        href={`/org/${orgSlug}/settings/users/roles`}
        label="Roles"
        className="mb-4"
      />
      <PageHeader>
        <PageTitle>Add role</PageTitle>
      </PageHeader>
      <RoleForm orgSlug={orgSlug} />
    </Page>
  )
}
