import { Page, PageHeader, PageTitle } from '@876/ui/page'
import { redirect } from 'next/navigation'

import { DocumentCreateForm } from '@/features/documents/components/document-create-form'
import {
  loadDocumentItems,
  loadInitialDocumentCustomer,
  type DocumentCreateSearchParams,
} from '@/features/documents/document-create-data'
import { getInvoice } from '@/lib/invoice'

export const metadata = { title: 'New Quote' }

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: DocumentCreateSearchParams
}) {
  const invoice = await getInvoice()
  if (!invoice) redirect('/no-access')

  return (
    <Page>
      <PageHeader className="mb-4">
        <PageTitle>New Quote</PageTitle>
      </PageHeader>
      <DocumentCreateForm
        kind="quote"
        items={loadDocumentItems(invoice)}
        initialCustomer={loadInitialDocumentCustomer(invoice, searchParams)}
      />
    </Page>
  )
}
