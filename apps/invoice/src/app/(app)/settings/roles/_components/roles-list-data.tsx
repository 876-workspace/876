import { loadRoles } from '../_data'

import { RolesList } from './roles-list'

export async function RolesListData({ organizationId }: { organizationId: string }) {
  const { roles, error } = await loadRoles(organizationId)
  return <RolesList roles={roles} error={error} />
}
