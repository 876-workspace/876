import { PageHeader, PageTitle } from '@876/ui/page'
import { notFound } from 'next/navigation'

import { getManageContext } from '@/lib/auth/manage-context'
import { service } from '@/lib/service'

import { BranchForm } from '../../branch-form'

export const metadata = { title: 'Edit branch — Settings' }

type Props = { params: Promise<{ orgSlug: string; id: string }> }

export default async function EditBranchPage({ params }: Props) {
  const { orgSlug, id } = await params

  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant) notFound()

  if (ctx.role !== 'owner' && ctx.role !== 'admin')
    return (
      <>
        <PageHeader className="mb-8">
          <PageTitle>Edit branch</PageTitle>
        </PageHeader>
        <div className="876-empty-dashed max-w-2xl">
          You do not have permission to manage locations.
        </div>
      </>
    )

  const branch = await service.branches.retrieve({
    tenantId: ctx.tenant.id,
    id,
  })
  if (!branch) notFound()

  return (
    <>
      <PageHeader className="mb-8">
        <PageTitle>Edit branch</PageTitle>
      </PageHeader>

      <BranchForm orgSlug={orgSlug} branch={branch} />
    </>
  )
}
