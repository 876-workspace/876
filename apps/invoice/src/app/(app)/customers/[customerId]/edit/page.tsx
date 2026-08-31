import { notFound, redirect } from 'next/navigation'
import { Page, PageHeader, PageTitle } from '@876/ui/page'

import { getBilling } from '@/lib/services/billing'
import { getInvoiceContext } from '@/lib/auth/context'
import { getPlatformClient } from '@/lib/services/platform'
import { CustomerForm } from '../../_components/customer-form'

export const metadata = { title: 'Edit Customer' }

interface Props {
  params: Promise<{ customerId: string }>
}

export default async function EditCustomerPage({ params }: Props) {
  const { customerId } = await params
  const context = await getInvoiceContext()
  if (!context) redirect('/no-access')

  const billing = await getBilling(context.orgId)
  const [customerResult, platform] = await Promise.all([
    billing.customers.retrieve(customerId),
    getPlatformClient(),
  ])

  if (customerResult.error) {
    if (customerResult.error.code.endsWith('/not-found')) notFound()
    redirect('/customers')
  }

  const customer = customerResult.data

  const organization = await platform.organizations.retrieve({
    id: context.orgId,
  })
  const currency =
    organization.data?.currency_code ?? customer.defaultCurrency ?? 'JMD'

  return (
    <Page>
      <PageHeader className="mb-4">
        <PageTitle>Edit Customer</PageTitle>
      </PageHeader>

      <CustomerForm
        currency={currency}
        customer={{
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          companyName:
            'companyName' in customer ? String(customer.companyName) : null,
          status:
            'status' in customer
              ? (customer.status as 'ACTIVE' | 'ARCHIVED')
              : undefined,
        }}
      />
    </Page>
  )
}
