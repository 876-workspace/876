import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'

import { InviteForm } from '@/features/access/components/invite-form'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

export const metadata = { title: 'Invite member - Billing settings' }

export default async function InviteMemberPage() {
  const context = await requirePagePermission('members:write')
  const roles = await service.roles.list(context.tenant.id)

  return (
    <Page>
      <PageBreadcrumb href="/settings/users" label="Users" className="mb-4" />
      <PageHeader>
        <PageTitle>Invite member</PageTitle>
      </PageHeader>
      <InviteForm roles={roles} />
    </Page>
  )
}
