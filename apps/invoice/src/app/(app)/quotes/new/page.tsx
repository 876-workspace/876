import { Page, PageHeader, PageTitle } from '@876/ui/page'
import { redirect } from 'next/navigation'

import { DocumentCreateForm } from '@/features/documents/components/document-create-form'
import { getInvoice } from '@/lib/invoice'

export const metadata = { title: 'New Quote' }

export default async function NewQuotePage() {
  const invoice = await getInvoice()
  if (!invoice) redirect('/no-access')

  return (
    <Page>
      <PageHeader className="mb-4">
        <PageTitle>New Quote</PageTitle>
      </PageHeader>
      <DocumentCreateForm
        kind="quote"
        items={invoice.items.list({ active: true, limit: 20 }).then((result) =>
          result.data
            ? result.data.data.map((item) => ({
                value: `item:${item.id}`,
                label: item.name,
                itemId: item.id,
                priceId: null,
                defaultAmount: item.defaultSellingAmount,
                currency: item.defaultSellingCurrency,
                trackStock: item.trackStock,
                stockQuantity: item.stockQuantity,
                allowOutOfStock: item.allowOutOfStock,
              }))
            : []
        )}
      />
    </Page>
  )
}
