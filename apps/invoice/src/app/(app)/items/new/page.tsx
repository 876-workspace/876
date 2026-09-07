import { Page, PageHeader, PageTitle } from '@876/ui/page'
import { redirect } from 'next/navigation'

import { getInvoiceContext } from '@/lib/auth/context'
import { getInvoice } from '@/lib/invoice'
import { getPlatformClient } from '@/lib/services/platform'
import { ItemForm } from '../_components/item-form'

export const metadata = { title: 'New Item' }

export default async function NewItemPage() {
  const context = await getInvoiceContext()
  if (!context) redirect('/no-access')

  const platform = await getPlatformClient()
  const organization = await platform.organizations.retrieve({
    id: context.orgId,
  })
  const currency = organization.data?.currency_code ?? 'JMD'
  const invoice = await getInvoice()

  return (
    <Page>
      <PageHeader className="mb-4">
        <PageTitle>New Item</PageTitle>
      </PageHeader>

      <ItemForm
        currency={currency}
        variantsEnabled={
          invoice
            ? (await invoice.items.getPreferences()).data?.productVariants ===
              true
            : false
        }
      />
    </Page>
  )
}
