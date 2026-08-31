import { Suspense } from 'react'
import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'
import { notFound } from 'next/navigation'
import { Skeleton } from '@876/ui/skeleton'

import { getManageContext } from '@/lib/auth/manage-context'
import { requireCouriersData } from '@/lib/couriers'
import { getCouriers } from '@/lib/services/couriers'

import { WarehouseForm } from '../_components/warehouse-form'

export const metadata = { title: 'Add warehouse — Settings' }

type Props = { params: Promise<{ orgSlug: string }> }

export default async function NewWarehousePage({ params }: Props) {
  const { orgSlug } = await params

  return (
    <Page>
      <PageBreadcrumb
        href={`/${orgSlug}/settings/warehouses`}
        label="Warehouses"
        className="mb-4"
      />
      <PageHeader className="mb-8">
        <PageTitle>Add warehouse</PageTitle>
      </PageHeader>
      <Suspense fallback={<FormSkeleton />}>
        <NewWarehouseData orgSlug={orgSlug} />
      </Suspense>
    </Page>
  )
}

async function NewWarehouseData({ orgSlug }: { orgSlug: string }) {
  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant) notFound()

  if (ctx.role !== 'owner' && ctx.role !== 'admin')
    return (
      <div className="876-empty-dashed max-w-2xl">
        You do not have permission to manage locations.
      </div>
    )

  const $876 = await getCouriers()
  const warehouses = requireCouriersData(await $876.warehouses.list())

  return (
    <WarehouseForm
      orgSlug={orgSlug}
      isFirstWarehouse={warehouses.data.length === 0}
    />
  )
}

function FormSkeleton() {
  return <Skeleton className="h-96 w-full" />
}
