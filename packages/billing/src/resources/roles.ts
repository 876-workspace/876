import { Request } from '../request'
import type { Runtime } from '../runtime'
import {
  RoleCreatedSchema,
  RoleDeletedSchema,
  RoleListSchema,
  RoleSchema,
} from '../schemas'
import type {
  List,
  RequestOptions,
  Role,
  RoleCreateParams,
  RoleCreated,
  RoleDeleted,
  RoleUpdateParams,
} from '../types'

/**
 * `billing.roles.*` — the roles of an organization's finance workspace.
 *
 * 876 Billing and 876 Invoice share one workspace, so they share these roles.
 * Each product edits only its own permission surface
 * (`financePermissionSurface` in `@876/core/access`); a role may hold
 * permissions the editing product cannot see, and those must be preserved on
 * update rather than dropped.
 */
export function createRolesResource(runtime: Runtime) {
  return {
    list(options?: RequestOptions) {
      return Request<List<Role>>(
        runtime,
        { method: 'GET', path: '/api/v1/roles', signal: options?.signal },
        RoleListSchema
      )
    },
    create(params: RoleCreateParams, options?: RequestOptions) {
      return Request<RoleCreated>(
        runtime,
        {
          method: 'POST',
          path: '/api/v1/roles',
          body: params,
          signal: options?.signal,
        },
        RoleCreatedSchema
      )
    },
    retrieve(roleId: string, options?: RequestOptions) {
      return Request<Role>(
        runtime,
        {
          method: 'GET',
          path: `/api/v1/roles/${encodeURIComponent(roleId)}`,
          signal: options?.signal,
        },
        RoleSchema
      )
    },
    update(roleId: string, params: RoleUpdateParams, options?: RequestOptions) {
      return Request<RoleCreated>(
        runtime,
        {
          method: 'PATCH',
          path: `/api/v1/roles/${encodeURIComponent(roleId)}`,
          body: params,
          signal: options?.signal,
        },
        RoleCreatedSchema
      )
    },
    delete(roleId: string, options?: RequestOptions) {
      return Request<RoleDeleted>(
        runtime,
        {
          method: 'DELETE',
          path: `/api/v1/roles/${encodeURIComponent(roleId)}`,
          signal: options?.signal,
        },
        RoleDeletedSchema
      )
    },
  }
}
