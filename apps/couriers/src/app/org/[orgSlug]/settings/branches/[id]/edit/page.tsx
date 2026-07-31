import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'
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

  const branch = await service.branches.retrieve({
    tenantId: ctx.tenant.id,
    id,
  })
  if (!branch) notFound()

  return (
    <Page>
      <PageBreadcrumb
        href={`/org/${orgSlug}/settings/branches`}
        label="Locations & branches"
        className="mb-4"
      />

      <PageHeader className="mb-8">
        <PageTitle>Edit branch</PageTitle>
      </PageHeader>

      <BranchForm orgSlug={orgSlug} branch={branch} />
    </Page>
  )
}
