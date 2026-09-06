import { requirePagePermission } from '@/lib/auth/billing-context'

import { CreateRolePanel } from '../_components/role-panels'

export const metadata = { title: 'New role - Billing settings' }

export default async function NewRolePage() {
  await requirePagePermission('roles:write')

  return <CreateRolePanel />
}
