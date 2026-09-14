import { redirect } from 'next/navigation'

import { DocumentFormPage } from '@876/billing-ui/document/document-form-layout'
import { DocumentCreateForm } from '@/features/documents/components/document-create-form'
import {
  loadDocumentItems,
  loadDocumentTaxRates,
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
    <DocumentFormPage title="New Quote">
      <DocumentCreateForm
        kind="quote"
        taxRates={loadDocumentTaxRates(invoice.organizationId)}
        items={loadDocumentItems(invoice)}
        initialCustomer={loadInitialDocumentCustomer(invoice, searchParams)}
      />
    </DocumentFormPage>
  )
}
