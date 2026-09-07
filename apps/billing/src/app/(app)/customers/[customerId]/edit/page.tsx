import { notFound } from 'next/navigation'
import { Page, PageHeader, PageTitle } from '@876/ui/page'

import { resolveCustomer } from '@/app/(app)/_lib/detail-data'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { CustomerEditForm } from '../_components/customer-edit-form'

export const metadata = { title: 'Edit Customer' }

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ customerId: string }>
}) {
  const { customerId } = await params
  const context = await requirePagePermission('customers:write')
  const customer = await resolveCustomer(context.tenant.id, customerId)
  if (!customer) notFound()

  return (
    <Page>
      <PageHeader className="mb-4">
        <PageTitle>Edit Customer</PageTitle>
      </PageHeader>
      <CustomerEditForm
        currency={(
          customer.defaultCurrency ?? context.tenant.defaultCurrency
        ).toUpperCase()}
        customer={{
          id: customer.id,
          name: customer.name,
          companyName: customer.companyName,
          email: customer.email,
          phone: customer.phone,
          website: customer.website,
          taxRegistrationNumber: customer.taxRegistrationNumber,
          notes: customer.notes,
        }}
      />
    </Page>
  )
}
