import { notFound } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
  DetailCardIdBar,
} from '@876/ui/detail-card'

import { getManageContext } from '@/lib/auth/manage-context'
import {
  isCouriersNotFound,
  requireCouriersData,
  toRoleView,
} from '@/lib/couriers'
import { getCouriers } from '@/lib/clients/couriers'

import { ROLE_TYPE_PARAM, isRoleTypeFilter } from '../_components/roles-section'
import { RoleForm } from '../_components/role-form'

export const metadata = { title: 'Role — Settings' }

type Props = {
  params: Promise<{ orgSlug: string; roleId: string }>
  searchParams: Promise<{ type?: string }>
}

export default async function RolePage({ params, searchParams }: Props) {
  const [{ orgSlug, roleId }, query] = await Promise.all([params, searchParams])
  const role = await loadRole(orgSlug, roleId)
  if (!role) notFound()

  return (
    <DetailCard aria-label={`Role details: ${role.name}`}>
      <DetailCardHeader
        title={role.name}
        subtitle={role.description || undefined}
        meta={
          <Badge variant={role.systemKey !== null ? 'outline' : 'secondary'}>
            {role.systemKey !== null ? 'System' : 'Custom'}
          </Badge>
        }
        closeHref={closeHref(orgSlug, query.type)}
        closeLabel="Close role details"
      />
      <DetailCardBody>
        <RoleForm orgSlug={orgSlug} role={role} />
      </DetailCardBody>
      <DetailCardIdBar>{role.id}</DetailCardIdBar>
    </DetailCard>
  )
}

function closeHref(orgSlug: string, type: string | undefined): string {
  const base = `/${orgSlug}/settings/users/roles`
  return isRoleTypeFilter(type ?? null) && type !== 'all'
    ? `${base}?${ROLE_TYPE_PARAM}=${type}`
    : base
}

async function loadRole(orgSlug: string, roleId: string) {
  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant) return null

  const $876 = await getCouriers()
  const roleResult = await $876.roles.retrieve(roleId)
  if (isCouriersNotFound(roleResult)) return null
  return toRoleView(requireCouriersData(roleResult))
}
