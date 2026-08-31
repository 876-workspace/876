import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'

import { getManageContext } from '@/lib/auth/manage-context'
import {
  isCouriersNotFound,
  requireCouriersData,
  toRoleView,
} from '@/lib/couriers'
import { getCouriers } from '@/lib/services/couriers'

import { RoleForm } from '../_components/role-form'

export const metadata = { title: 'Role — Settings' }

export default async function RolePage({
  params,
}: {
  params: Promise<{ orgSlug: string; roleId: string }>
}) {
  const { orgSlug, roleId } = await params

  return (
    <Page>
      <PageBreadcrumb
        href={`/${orgSlug}/settings/users/roles`}
        label="Roles"
        className="mb-4"
      />
      <Suspense fallback={<RoleSkeleton />}>
        <RoleData orgSlug={orgSlug} roleId={roleId} />
      </Suspense>
    </Page>
  )
}

type RoleDataProps = { orgSlug: string; roleId: string }

async function RoleData({ orgSlug, roleId }: RoleDataProps) {
  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant) return null

  const $876 = await getCouriers()
  const roleResult = await $876.roles.retrieve(roleId)
  if (isCouriersNotFound(roleResult)) notFound()
  const role = toRoleView(requireCouriersData(roleResult))

  return (
    <>
      <PageHeader>
        <PageTitle>{role.name}</PageTitle>
      </PageHeader>
      <RoleForm orgSlug={orgSlug} role={role} />
    </>
  )
}

function RoleSkeleton() {
  return (
    <>
      <PageHeader>
        <PageTitle>Role</PageTitle>
      </PageHeader>
      <Skeleton className="h-80 w-full" />
    </>
  )
}
