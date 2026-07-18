import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'

import { RoleCreateForm } from '@/components/billing-role-create-form'
import { requirePagePermission } from '@/lib/auth/billing-context'

export const metadata = { title: 'New role - Billing settings' }

export default async function NewRolePage() {
  await requirePagePermission('roles:write')

  return (
    <Page>
      <PageBreadcrumb href="/settings/roles" label="Roles" className="mb-4" />
      <PageHeader>
        <PageTitle>New role</PageTitle>
      </PageHeader>
      <RoleCreateForm />
    </Page>
  )
}
