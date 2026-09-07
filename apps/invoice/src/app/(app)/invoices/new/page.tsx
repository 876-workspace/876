import { Page, PageHeader, PageTitle } from '@876/ui/page'
import { redirect } from 'next/navigation'

import { DocumentCreateForm } from '@/features/documents/components/document-create-form'
import {
  loadDocumentItems,
  loadInitialDocumentCustomer,
  type DocumentCreateSearchParams,
} from '@/features/documents/document-create-data'
import { getInvoice } from '@/lib/invoice'

export const metadata = { title: 'New Invoice' }

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: DocumentCreateSearchParams
}) {
  const invoice = await getInvoice()
  if (!invoice) redirect('/no-access')

  const items = loadDocumentItems(invoice)
  const initialCustomer = loadInitialDocumentCustomer(invoice, searchParams)

  return (
    <Page>
      <PageHeader className="mb-4">
        <PageTitle>New Invoice</PageTitle>
      </PageHeader>
      <DocumentCreateForm
        kind="invoice"
        items={items}
        initialCustomer={initialCustomer}
      />
    </Page>
  )
}
