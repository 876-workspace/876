import { notFound } from 'next/navigation'
import { Page, PageHeader, PageTitle } from '@876/ui/page'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { getBilling } from '@/lib/clients/billing'
import { CustomerContactFormAdapter } from '../../../_components/customer-contact-form'
export const metadata = { title: 'Edit contact' }
export default async function EditCustomerContactPage({
  params,
}: {
  params: Promise<{ customerId: string; contactId: string }>
}) {
  const { customerId, contactId } = await params
  await requirePagePermission('customers:write')
  const billing = await getBilling()
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
