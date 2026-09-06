import { loadRoles } from '../_data'
import { RolesList } from './roles-list'

export async function RolesListData({ tenantId }: { tenantId: string }) {
  const roles = await loadRoles(tenantId)

  return <RolesList roles={roles} />
}
