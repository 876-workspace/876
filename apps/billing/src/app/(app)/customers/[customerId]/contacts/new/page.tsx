import { Page, PageHeader, PageTitle } from '@876/ui/page'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { CustomerContactFormAdapter } from '../../_components/customer-contact-form'
export const metadata = { title: 'New contact' }
export default async function NewCustomerContactPage({
  params,
}: {
  params: Promise<{ customerId: string }>
}) {
  const { customerId } = await params
  await requirePagePermission('customers:write')
  return (
    <Page>
      <PageHeader className="mb-4">
        <PageTitle>New contact</PageTitle>
      </PageHeader>
      <CustomerContactFormAdapter customerId={customerId} />
    </Page>
  )
}
