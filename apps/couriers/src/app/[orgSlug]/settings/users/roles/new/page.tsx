import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
} from '@876/ui/detail-card'

import { getManageContext } from '@/lib/auth/manage-context'

import { ROLE_TYPE_PARAM, isRoleTypeFilter } from '../_components/roles-section'
import { RoleForm } from '../_components/role-form'

export const metadata = { title: 'Add role — Settings' }

type Props = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ type?: string }>
}

/** The create form opens in the detail column, where its record will appear. */
export default async function NewRolePage({ params, searchParams }: Props) {
  const [{ orgSlug }, query] = await Promise.all([params, searchParams])
  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant) return null

  const base = `/${orgSlug}/settings/users/roles`
  const closeHref =
    isRoleTypeFilter(query.type ?? null) && query.type !== 'all'
      ? `${base}?${ROLE_TYPE_PARAM}=${query.type}`
      : base

  return (
    <DetailCard aria-label="Add role">
      <DetailCardHeader
        title="Add role"
        closeHref={closeHref}
        closeLabel="Close role editor"
      />
      <DetailCardBody>
        <RoleForm orgSlug={orgSlug} />
      </DetailCardBody>
    </DetailCard>
  )
}
