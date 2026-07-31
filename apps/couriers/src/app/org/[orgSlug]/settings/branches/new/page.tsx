import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'
import { notFound } from 'next/navigation'

import { getManageContext } from '@/lib/auth/manage-context'
import { service } from '@/lib/service'

import { BranchForm } from '../branch-form'

export const metadata = { title: 'Add branch — Settings' }

type Props = { params: Promise<{ orgSlug: string }> }

export default async function NewBranchPage({ params }: Props) {
  const { orgSlug } = await params

  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant) notFound()

  const branches = await service.branches.list({ tenantId: ctx.tenant.id })

  return (
    <Page>
      <PageBreadcrumb
        href={`/org/${orgSlug}/settings/branches`}
        label="Locations & branches"
        className="mb-4"
      />

      <PageHeader className="mb-8">
        <PageTitle>Add branch</PageTitle>
      </PageHeader>

      <BranchForm orgSlug={orgSlug} isFirstBranch={branches.length === 0} />
    </Page>
  )
}
