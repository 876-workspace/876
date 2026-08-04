import { Suspense } from 'react'
import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'

import { getManageContext } from '@/lib/auth/manage-context'

import { RoleForm } from '../_components/role-form'

export const metadata = { title: 'Add role — Settings' }

export default async function NewRolePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params

  return (
    <Page>
      <PageBreadcrumb
        href={`/org/${orgSlug}/settings/users/roles`}
        label="Roles"
        className="mb-4"
      />
      <PageHeader>
        <PageTitle>Add role</PageTitle>
      </PageHeader>
      <Suspense fallback={<FormSkeleton />}>
        <NewRoleData orgSlug={orgSlug} />
      </Suspense>
    </Page>
  )
}

async function NewRoleData({ orgSlug }: { orgSlug: string }) {
  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant) return null

  return <RoleForm orgSlug={orgSlug} />
}

function FormSkeleton() {
  return <Skeleton className="h-80 w-full" />
}
