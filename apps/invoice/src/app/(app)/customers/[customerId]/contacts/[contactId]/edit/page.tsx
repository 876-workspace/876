import { notFound, redirect } from 'next/navigation'
import { Page, PageHeader, PageTitle } from '@876/ui/page'
import { getInvoiceContext } from '@/lib/auth/context'
import { getBilling } from '@/lib/services/billing'
import { CustomerContactFormAdapter } from '../../../_components/customer-contact-form'
export const metadata = { title: 'Edit contact' }
export default async function EditCustomerContactPage({
  params,
}: {
  params: Promise<{ customerId: string; contactId: string }>
}) {
  const { customerId, contactId } = await params
  const context = await getInvoiceContext()
  if (!context || context.role === 'staff') redirect('/no-access')
  const billing = await getBilling(context.orgId)
  const result = await billing.customers.contacts.retrieve(
    customerId,
    contactId
  )
  if (result.error) notFound()
  return (
    <Page>
      <PageHeader className="mb-4">
        <PageTitle>Edit contact</PageTitle>
      </PageHeader>
      <CustomerContactFormAdapter
        customerId={customerId}
        contactId={contactId}
        initial={result.data}
      />
    </Page>
  )
}
