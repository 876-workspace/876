import { Page, PageHeader, PageTitle } from '@876/ui/page'
import { redirect } from 'next/navigation'

import { getInvoiceContext } from '@/lib/auth/context'
import { getPlatformClient } from '@/lib/876/platform-client'
import { CustomerForm } from '../_components/customer-form'

export const metadata = { title: 'New Customer' }

export default async function NewCustomerPage() {
  const context = await getInvoiceContext()
  if (!context) redirect('/no-access')

  const platform = await getPlatformClient()
  const organization = await platform.organizations.retrieve({
    id: context.orgId,
  })
  const currency = organization.data?.currency_code ?? 'JMD'

  return (
    <Page>
      <PageHeader className="mb-4">
        <PageTitle>New Customer</PageTitle>
      </PageHeader>

      <CustomerForm currency={currency} />
    </Page>
  )
}
