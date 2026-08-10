import { AdminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import {
  deletedRoleSchema,
  roleListSchema,
  roleSchema,
  type DeletedRole,
  type Role,
  type CreateRoleBody,
  type RoleList,
  type UpdateRoleBody,
} from '../types/role.schema'

export function createRolesResource(runtime: AdminRuntime) {
  const path = (tenantId: string) =>
    `/v1/tenants/${encodeURIComponent(tenantId)}/roles`
  return {
    list(tenantId: string) {
      return AdminRequest<RoleList>(
        runtime,
        { method: 'GET', path: path(tenantId) },
        roleListSchema
      )
    },
    retrieve(tenantId: string, id: string) {
      return AdminRequest<Role>(
        runtime,
        {
          method: 'GET',
          path: `${path(tenantId)}/${encodeURIComponent(id)}`,
        },
        roleSchema
      )
    },
    create(tenantId: string, body: CreateRoleBody) {
      return AdminRequest<Role>(
        runtime,
        { method: 'POST', path: path(tenantId), body },
        roleSchema
      )
    },
    update(tenantId: string, id: string, body: UpdateRoleBody) {
      return AdminRequest<Role>(
        runtime,
        {
          method: 'PATCH',
          path: `${path(tenantId)}/${encodeURIComponent(id)}`,
          body,
        },
        roleSchema
      )
    },
    delete(tenantId: string, id: string) {
      return AdminRequest<DeletedRole>(
        runtime,
        {
          method: 'DELETE',
          path: `${path(tenantId)}/${encodeURIComponent(id)}`,
        },
        deletedRoleSchema
      )
    },
  }
}
