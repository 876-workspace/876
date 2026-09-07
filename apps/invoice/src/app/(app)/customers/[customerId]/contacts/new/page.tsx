import { redirect } from 'next/navigation'
import { Page, PageHeader, PageTitle } from '@876/ui/page'
import { getInvoiceContext } from '@/lib/auth/context'
import { CustomerContactFormAdapter } from '../../_components/customer-contact-form'
export const metadata = { title: 'New contact' }
export default async function NewCustomerContactPage({
  params,
}: {
  params: Promise<{ customerId: string }>
}) {
  const { customerId } = await params
  const context = await getInvoiceContext()
  if (!context || context.role === 'staff') redirect('/no-access')
  return (
    <Page>
      <PageHeader className="mb-4">
        <PageTitle>New contact</PageTitle>
      </PageHeader>
      <CustomerContactFormAdapter customerId={customerId} />
    </Page>
  )
}
