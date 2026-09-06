import { Page, PageHeader, PageTitle } from '@876/ui/page'
import { redirect } from 'next/navigation'

import { DocumentCreateForm } from '@/features/documents/components/document-create-form'
import { getInvoice } from '@/lib/invoice'

export const metadata = { title: 'New Invoice' }

export default async function NewInvoicePage() {
  const invoice = await getInvoice()
  if (!invoice) redirect('/no-access')

  const customers = invoice.customers
    .list({ status: 'ACTIVE' })
    .then((result) =>
      result.data ? result.data.data.map(({ id, name }) => ({ id, name })) : []
    )

  return (
    <Page>
      <PageHeader className="mb-4">
        <PageTitle>New Invoice</PageTitle>
      </PageHeader>
      <DocumentCreateForm kind="invoice" customers={customers} />
    </Page>
  )
}
