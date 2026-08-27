import { Page, PageBreadcrumb } from '@876/ui/page'

import { $876 } from '@/lib/876'
import { requireCrmContext } from '@/lib/auth/require-crm-context'

import { RequestForm } from '../_components/request-form'

export const metadata = { title: 'Add request' }

export default async function NewRequestPage() {
  const context = await requireCrmContext()
  const [customers, departmentsResult, membersResult] = await Promise.all([
    $876.customerProfiles.list(context.orgId),
    $876.departments.list(context.orgId),
    $876.organizationMembers.list(context.orgId),
  ])
  if (customers.error) throw new Error(customers.error.message)

  const departments =
    departmentsResult.data?.data.map((d) => ({ id: d.id, name: d.name })) ?? []

  const members =
    membersResult.data?.data.map((m) => {
      const nameParts = [m.first_name, m.last_name].filter(Boolean)
      const name =
        nameParts.length > 0 ? nameParts.join(' ') : (m.email ?? m.user_id)
      return {
        userId: m.user_id,
        name,
        email: m.email,
      }
    }) ?? []

  return (
    <Page>
      <PageBreadcrumb href="/requests" label="Requests" className="mb-4" />
      <h1 className="876-page-title mb-6">Add request</h1>
      <RequestForm
        customers={customers.data.data}
        departments={departments}
        members={members}
      />
    </Page>
  )
}
