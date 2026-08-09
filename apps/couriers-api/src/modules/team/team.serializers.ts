import { fromDbUnixSeconds } from '@/platform/timestamps'
import type { Role, TeamMember } from './team.schemas'
const validPermissions = new Set([
  'items.view',
  'items.create',
  'items.edit',
  'items.delete',
  'customers.view',
  'customers.create',
  'customers.edit',
  'customers.delete',
  'customers.import',
  'customers.export',
  'packages.view',
  'packages.create',
  'packages.edit',
  'packages.delete',
  'packages.export',
  'pre_alerts.view',
  'pre_alerts.create',
  'pre_alerts.edit',
  'pre_alerts.delete',
  'warehouse.view',
  'warehouse.create',
  'warehouse.edit',
  'warehouse.delete',
  'manifests.view',
  'manifests.create',
  'manifests.edit',
  'manifests.delete',
  'deliveries.view',
  'deliveries.create',
  'deliveries.edit',
  'deliveries.delete',
  'invoices.view',
  'invoices.create',
  'invoices.edit',
  'invoices.delete',
  'payments.view',
  'payments.create',
  'payments.edit',
  'payments.delete',
  'reports.view',
  'settings.view',
  'settings.edit',
])
const adminPermissions = [...validPermissions]
const staffPermissions = adminPermissions.filter(
  (key) => !key.startsWith('reports.') && !key.startsWith('settings.')
)
export function isValidPermission(key: string) {
  return validPermissions.has(key)
}
export function serializeRole(row: {
  id: string
  tenantId: string
  name: string
  description: string
  systemKey: string | null
  permissions: unknown
  createdAt: number | bigint
  updatedAt: number | bigint
  _count?: { members: number }
}): Role {
  const permissions =
    row.systemKey === 'admin'
      ? adminPermissions
      : row.systemKey === 'staff'
        ? staffPermissions
        : Array.isArray(row.permissions)
          ? row.permissions.filter(
              (value): value is string =>
                typeof value === 'string' && isValidPermission(value)
            )
          : []
  return {
    object: 'role',
    id: row.id,
    tenant_id: row.tenantId,
    name: row.name,
    description: row.description,
    permissions,
    is_default: row.systemKey === 'admin' || row.systemKey === 'staff',
    system_key:
      row.systemKey === 'admin' || row.systemKey === 'staff'
        ? row.systemKey
        : null,
    member_count: row._count?.members ?? 0,
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}
export function serializeMember(row: {
  id: string
  tenantId: string
  userId: string
  roleId: string
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: number | bigint
  updatedAt: number | bigint
  role: { name: string; systemKey: string | null }
}): TeamMember {
  return {
    object: 'team_member',
    id: row.id,
    tenant_id: row.tenantId,
    user_id: row.userId,
    role_id: row.roleId,
    role_name: row.role.name,
    role_system_key:
      row.role.systemKey === 'admin' || row.role.systemKey === 'staff'
        ? row.role.systemKey
        : null,
    status: row.status === 'ACTIVE' ? 'active' : 'inactive',
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}
