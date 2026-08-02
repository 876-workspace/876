import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'
import { notFound } from 'next/navigation'

import { getManageContext } from '@/lib/auth/manage-context'
import { service } from '@/lib/service'

import { WarehouseForm } from '../../_components/warehouse-form'

export const metadata = { title: 'Edit warehouse — Settings' }

type Props = { params: Promise<{ orgSlug: string; id: string }> }

export default async function EditWarehousePage({ params }: Props) {
  const { orgSlug, id } = await params

  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant) notFound()

  if (ctx.role !== 'owner' && ctx.role !== 'admin')
    return (
      <Page>
        <PageBreadcrumb
          href={`/org/${orgSlug}/settings/warehouses`}
          label="Warehouses"
          className="mb-4"
        />
        <PageHeader className="mb-8">
          <PageTitle>Edit warehouse</PageTitle>
        </PageHeader>
        <div className="876-empty-dashed max-w-2xl">
          You do not have permission to manage locations.
        </div>
      </Page>
    )

  const warehouse = await service.warehouses.retrieve({
    tenantId: ctx.tenant.id,
    id,
  })
  if (!warehouse) notFound()

  return (
    <Page>
      <PageBreadcrumb
        href={`/org/${orgSlug}/settings/warehouses`}
        label="Warehouses"
        className="mb-4"
      />
      <PageHeader className="mb-8">
        <PageTitle>Edit warehouse</PageTitle>
      </PageHeader>

      <WarehouseForm orgSlug={orgSlug} warehouse={warehouse} />
    </Page>
  )
}
