import type { Role } from '@/db'

import { billingPermissionValues } from './access.schemas'

const permissions = new Set<string>(billingPermissionValues)

export function serializeRole(row: Role & { _count: { members: number } }) {
  return {
    object: 'billing_role',
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    permissions: row.permissions.filter((value) => permissions.has(value)),
    isSystem: row.isSystem,
    isDefault: row.isDefault,
    memberCount: row._count.members,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
