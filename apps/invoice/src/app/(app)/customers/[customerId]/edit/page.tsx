import { notFound, redirect } from 'next/navigation'
import { Page, PageHeader, PageTitle } from '@876/ui/page'

import { getInvoiceContext } from '@/lib/auth/context'
import { getBilling } from '@/lib/services/billing'
import { CustomerForm } from '../../_components/customer-form'

export const metadata = { title: 'Edit Customer' }

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ customerId: string }>
}) {
  const { customerId } = await params
  const context = await getInvoiceContext()
  if (!context) redirect('/no-access')

  const billing = await getBilling(context.orgId)
  const result = await billing.customers.retrieve(customerId)
  if (result.error) {
    if (result.error.code.endsWith('/not-found')) notFound()
    redirect('/customers')
  }

  const customer = result.data

  return (
    <Page>
      <PageHeader className="mb-4">
        <PageTitle>Edit Customer</PageTitle>
      </PageHeader>

      <CustomerForm
        currency={customer.defaultCurrency ?? 'JMD'}
        customer={{
          id: customer.id,
          name: customer.name,
          companyName: customer.companyName,
          email: customer.email,
          phone: customer.phone,
          status: customer.status,
        }}
      />
    </Page>
  )
}
