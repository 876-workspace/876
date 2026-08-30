import { AppError } from '@876/ui/app-error'
import { Page, PageBreadcrumb } from '@876/ui/page'

import { requireCrmContext } from '@/lib/auth/require-crm-context'
import { crm } from '@/lib/services/crm'
import { getWorkspace } from '@/lib/services/workspace'

import { RequestForm } from '../_components/request-form'

export const metadata = { title: 'New request' }

export default async function NewRequestPage() {
  const context = await requireCrmContext()
  const workspace = await getWorkspace()
  const [customers, departmentsResult, membersResult, categoriesResult, prioritiesResult] =
    await Promise.all([
      crm.customerProfiles.list(context.orgId),
      workspace.departments.list(context.orgId),
      workspace.members.list(context.orgId),
      crm.requestCategories.list(context.orgId),
      crm.requestPriorities.list(context.orgId, { active: true }),
    ])

  const departments =
    departmentsResult.data?.data.map((department) => ({
      id: department.id,
      name: department.name,
    })) ?? []

  const members =
    membersResult.data?.data.map((member) => {
      const nameParts = [member.first_name, member.last_name].filter(Boolean)
      const name =
        nameParts.length > 0
          ? nameParts.join(' ')
          : (member.email ?? member.user_id)
      return { userId: member.user_id, name, email: member.email }
    }) ?? []

  return (
    <Page>
      <div className="mb-5">
        <PageBreadcrumb href="/requests" label="Requests" className="mb-2" />
        <h1 className="876-page-title mt-2">New request</h1>
      </div>
      <div className="space-y-3">
        {customers.error ? (
          <AppError title="Customer options are temporarily incomplete" error={customers.error} variant="banner" />
        ) : null}
        {prioritiesResult.error ? (
          <AppError title="Priority options are temporarily incomplete" error={prioritiesResult.error} variant="inline" />
        ) : null}
        {categoriesResult.error ? (
          <AppError title="Category options are temporarily incomplete" error={categoriesResult.error} variant="inline" />
        ) : null}
        {departmentsResult.error ? (
          <AppError title="Team options are temporarily incomplete" error={departmentsResult.error} variant="inline" />
        ) : null}
        {membersResult.error ? (
          <AppError title="Assignee options are temporarily incomplete" error={membersResult.error} variant="inline" />
        ) : null}
        <RequestForm
          customers={customers.data?.data ?? []}
          categories={categoriesResult.data?.data ?? []}
          priorities={prioritiesResult.data?.data ?? []}
          departments={departments}
          members={members}
        />
      </div>
    </Page>
  )
}
