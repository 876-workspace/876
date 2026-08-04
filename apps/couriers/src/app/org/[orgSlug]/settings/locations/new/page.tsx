import { Suspense } from 'react'
import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'
import { notFound } from 'next/navigation'
import { Skeleton } from '@876/ui/skeleton'

import { getManageContext } from '@/lib/auth/manage-context'
import { service } from '@/lib/service'

import { BranchForm } from '../_components/branch-form'

export const metadata = { title: 'Add branch — Settings' }

type Props = { params: Promise<{ orgSlug: string }> }

export default async function NewBranchPage({ params }: Props) {
  const { orgSlug } = await params

  return (
    <Page>
      <PageBreadcrumb
        href={`/org/${orgSlug}/settings/locations`}
        label="Locations"
        className="mb-4"
      />
      <PageHeader className="mb-8">
        <PageTitle>Add branch</PageTitle>
      </PageHeader>
      <Suspense fallback={<FormSkeleton />}>
        <NewBranchData orgSlug={orgSlug} />
      </Suspense>
    </Page>
  )
}

async function NewBranchData({ orgSlug }: { orgSlug: string }) {
  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant) notFound()

  if (ctx.role !== 'owner' && ctx.role !== 'admin')
    return (
      <div className="876-empty-dashed max-w-2xl">
        You do not have permission to manage locations.
      </div>
    )

  const branches = await service.branches.list({ tenantId: ctx.tenant.id })

  return <BranchForm orgSlug={orgSlug} isFirstBranch={branches.length === 0} />
}

function FormSkeleton() {
  return <Skeleton className="h-96 w-full" />
}
