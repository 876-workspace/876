import { Suspense } from 'react'
import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'
import { notFound } from 'next/navigation'
import { Skeleton } from '@876/ui/skeleton'

import { getManageContext } from '@/lib/auth/manage-context'
import {
  isCouriersNotFound,
  requireCouriersData,
  toBranchView,
} from '@/lib/couriers'
import { get876Client } from '@/lib/876'

import { BranchForm } from '../../_components/branch-form'

export const metadata = { title: 'Edit branch — Settings' }

type Props = { params: Promise<{ orgSlug: string; id: string }> }

export default async function EditBranchPage({ params }: Props) {
  const { orgSlug, id } = await params

  return (
    <Page>
      <PageBreadcrumb
        href={`/${orgSlug}/settings/locations`}
        label="Locations"
        className="mb-4"
      />
      <PageHeader className="mb-8">
        <PageTitle>Edit branch</PageTitle>
      </PageHeader>
      <Suspense fallback={<FormSkeleton />}>
        <EditBranchData orgSlug={orgSlug} id={id} />
      </Suspense>
    </Page>
  )
}

type EditBranchDataProps = { orgSlug: string; id: string }

async function EditBranchData({ orgSlug, id }: EditBranchDataProps) {
  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant) notFound()

  if (ctx.role !== 'owner' && ctx.role !== 'admin')
    return (
      <div className="876-empty-dashed max-w-2xl">
        You do not have permission to manage locations.
      </div>
    )

  const $876 = await get876Client()
  const result = await $876.branches.retrieve(id)
  if (!result.data && isCouriersNotFound(result)) notFound()

  return (
    <BranchForm
      orgSlug={orgSlug}
      branch={toBranchView(requireCouriersData(result))}
    />
  )
}

function FormSkeleton() {
  return <Skeleton className="h-96 w-full" />
}
