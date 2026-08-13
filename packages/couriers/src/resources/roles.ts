import { SessionRequest } from '../session-request'
import type { Runtime } from '../runtime'
import {
  deletedRoleSchema,
  roleListSchema,
  roleSchema,
  type CreateRoleBody,
  type DeletedRole,
  type Role,
  type RoleList,
  type UpdateRoleBody,
} from '../admin/types/role.schema'

export function createRolesResource(runtime: Runtime) {
  const path = '/v1/me/roles'
  return {
    list() {
      return SessionRequest<RoleList>(runtime, { method: 'GET', path }, roleListSchema)
    },
    retrieve(id: string) {
      return SessionRequest<Role>(runtime, { method: 'GET', path: `${path}/${encodeURIComponent(id)}` }, roleSchema)
    },
    create(body: CreateRoleBody) {
      return SessionRequest<Role>(runtime, { method: 'POST', path, body }, roleSchema)
    },
    update(id: string, body: UpdateRoleBody) {
      return SessionRequest<Role>(runtime, { method: 'PATCH', path: `${path}/${encodeURIComponent(id)}`, body }, roleSchema)
    },
    delete(id: string) {
      return SessionRequest<DeletedRole>(runtime, { method: 'DELETE', path: `${path}/${encodeURIComponent(id)}` }, deletedRoleSchema)
    },
  }
}
