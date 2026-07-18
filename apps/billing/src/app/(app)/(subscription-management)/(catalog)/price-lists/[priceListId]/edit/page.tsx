import { notFound } from 'next/navigation'

import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'

import { CreateForm } from '@/components/billing-create-form'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

export default async function EditPriceListPage({
  params,
}: {
  params: Promise<{ priceListId: string }>
}) {
  const { priceListId } = await params
  const context = await requirePagePermission('catalog:write')
  const priceList = await service.priceLists.retrieve(
    context.tenant.id,
    priceListId
  )
  if (!priceList) notFound()

  return (
    <Page>
      <PageBreadcrumb
        href={`/price-lists/${priceList.id}`}
        label={priceList.name}
        className="mb-4"
      />
      <PageHeader>
        <PageTitle>Edit Price List</PageTitle>
      </PageHeader>
      <CreateForm
        title="Price List"
        method="PATCH"
        endpoint={`/api/v1/price-lists/${priceList.id}`}
        returnUrl={`/price-lists/${priceList.id}`}
        submitLabel="Save price list"
        fields={[
          {
            name: 'name',
            label: 'Name',
            type: 'text',
            required: true,
            initialValue: priceList.name,
          },
          {
            name: 'description',
            label: 'Description',
            type: 'text',
            initialValue: priceList.description ?? '',
            emptyAsNull: true,
          },
        ]}
      />
    </Page>
  )
}
