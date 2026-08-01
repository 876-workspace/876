import { PageHeader, PageTitle } from '@876/ui/page'
import { notFound } from 'next/navigation'

import { getManageContext } from '@/lib/auth/manage-context'
import { service } from '@/lib/service'

import { WarehouseForm } from '../../warehouse-form'

export const metadata = { title: 'Add warehouse — Settings' }

type Props = { params: Promise<{ orgSlug: string }> }

export default async function NewWarehousePage({ params }: Props) {
  const { orgSlug } = await params

  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant) notFound()

  if (ctx.role !== 'owner' && ctx.role !== 'admin')
    return (
      <>
        <PageHeader className="mb-8">
          <PageTitle>Add warehouse</PageTitle>
        </PageHeader>
        <div className="876-empty-dashed max-w-2xl">
          You do not have permission to manage locations.
        </div>
      </>
    )

  const warehouses = await service.warehouses.list({
    tenantId: ctx.tenant.id,
  })

  return (
    <>
      <PageHeader className="mb-8">
        <PageTitle>Add warehouse</PageTitle>
      </PageHeader>

      <WarehouseForm
        orgSlug={orgSlug}
        isFirstWarehouse={warehouses.length === 0}
      />
    </>
  )
}
