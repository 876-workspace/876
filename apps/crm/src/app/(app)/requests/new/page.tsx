import { Page, PageBreadcrumb } from '@876/ui/page'

import { $876 } from '@/lib/876'
import { requireCrmContext } from '@/lib/auth/require-crm-context'

import { RequestForm } from '../_components/request-form'

export const metadata = { title: 'Add request' }

export default async function NewRequestPage() {
  const context = await requireCrmContext()
  const customers = await $876.customerProfiles.list(context.orgId)
  if (customers.error) throw new Error(customers.error.message)

  return (
    <Page>
      <PageBreadcrumb href="/requests" label="Requests" className="mb-4" />
      <h1 className="876-page-title mb-6">Add request</h1>
      <RequestForm customers={customers.data.data} />
    </Page>
  )
}
