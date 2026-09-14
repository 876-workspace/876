import { getManageContext } from '@/lib/auth/manage-context'
import { requireCouriersData, toRoleView } from '@/lib/couriers'
import { getCouriers } from '@/lib/services/couriers'

import { RolesList } from '../_components/roles-list'

/**
 * Data half of the list column. Rendered inside a Suspense boundary so the
 * toolbar is interactive before the role list resolves.
 */
export async function RolesListData({ orgSlug }: { orgSlug: string }) {
  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant)
    return (
      <div className="876-empty-dashed max-w-2xl">
        We couldn&apos;t load this organization&apos;s roles. Please try again.
      </div>
    )

  const $876 = await getCouriers()
  const roles = requireCouriersData(await $876.roles.list()).data.map(
    toRoleView
  )

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <RolesList orgSlug={orgSlug} roles={roles} />
    </div>
  )
}
