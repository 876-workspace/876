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
    <DocumentFormPage title="New Invoice">
      <DocumentCreateForm
        kind="invoice"
        taxRates={loadDocumentTaxRates(invoice.organizationId)}
        items={items}
        initialCustomer={initialCustomer}
      />
    </DocumentFormPage>
  )
}
