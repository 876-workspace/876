import { adminRequest } from '../request'
import type { AdminRuntime } from '../runtime'

export type AdminAppPermission = {
  object: 'app_permission'
  id: string
  app_id: string
  key: string
  module_key: string
  action: string
  label: string
  description: string | null
  is_dangerous: boolean
  position: number
  created_at: number
  updated_at: number
}

export type AdminAppRole = {
  object: 'app_role'
  id: string
  app_id: string
  organization_id: string | null
  key: string
  name: string
  description: string | null
  permissions: string[]
  is_system: boolean
  is_default: boolean
  template_key: string | null
  position: number
  members_count: number | null
  created_at: number
  updated_at: number
}

export type AdminAppMembership = {
  object: 'app_membership'
  id: string
  organization_id: string
  user_id: string
  membership_id: string
  app_id: string
  app_slug: string
  app_name: string
  status: string
  assigned: boolean
  entitled: boolean
  app_role: AdminAppRole | null
  permission_grants: string[]
  permission_denies: string[]
  effective_permissions: string[]
  title: string | null
  attributes: Record<string, unknown> | null
  assigned_by: string | null
  assigned_at: number | null
  last_access_at: number | null
  revoked_at: number | null
  created_at: number | null
  updated_at: number | null
}

type ListResponse<T> = {
  object: 'list'
  data: T[]
  has_more: boolean
  url: string
  total_count?: number | null
}

type PermissionCreate = Omit<
  AdminAppPermission,
  'object' | 'id' | 'app_id' | 'created_at' | 'updated_at'
>
type PermissionUpdate = Partial<
  Pick<
    AdminAppPermission,
    'label' | 'description' | 'is_dangerous' | 'position'
  >
>
type RoleCreate = Pick<
  AdminAppRole,
  | 'key'
  | 'name'
  | 'description'
  | 'permissions'
  | 'is_system'
  | 'is_default'
  | 'position'
>
type RoleUpdate = Partial<RoleCreate>
type MembershipCreate = {
  user_id?: string
  membership_id?: string
  app_id?: string
  app_slug?: string
  app_role_id?: string
  permission_grants?: string[]
  permission_denies?: string[]
  title?: string | null
  attributes?: Record<string, unknown> | null
  status?: string
}
type MembershipUpdate = {
  app_role_id?: string | null
  permission_grants?: string[]
  permission_denies?: string[]
  title?: string | null
  attributes?: Record<string, unknown> | null
  status?: string
}

type Deleted<TObject extends string> = {
  object: TObject
  id: string
  deleted: true
}

/** Core app-access control plane for Console and other internal administration. */
export function createAdminAppAccessResource(runtime: AdminRuntime) {
  const appPermissions = {
    list(appId: string) {
      return adminRequest<ListResponse<AdminAppPermission>>(runtime, {
        method: 'GET',
        path: `/apps/${appId}/permissions`,
      })
    },
    create(appId: string, body: PermissionCreate) {
      return adminRequest<AdminAppPermission>(runtime, {
        method: 'POST',
        path: `/apps/${appId}/permissions`,
        body,
      })
    },
    update(appId: string, permissionId: string, body: PermissionUpdate) {
      return adminRequest<AdminAppPermission>(runtime, {
        method: 'PATCH',
        path: `/apps/${appId}/permissions/${permissionId}`,
        body,
      })
    },
    delete(appId: string, permissionId: string) {
      return adminRequest<Deleted<'app_permission'>>(runtime, {
        method: 'DELETE',
        path: `/apps/${appId}/permissions/${permissionId}`,
      })
    },
    sync(appId: string, permissions: PermissionCreate[]) {
      return adminRequest<ListResponse<AdminAppPermission>>(runtime, {
        method: 'POST',
        path: `/apps/${appId}/permissions/sync`,
        body: { permissions },
      })
    },
  }

  const appRoles = {
    list(appId: string) {
      return adminRequest<ListResponse<AdminAppRole>>(runtime, {
        method: 'GET',
        path: `/apps/${appId}/roles`,
      })
    },
    retrieve(appId: string, roleId: string) {
      return adminRequest<AdminAppRole>(runtime, {
        method: 'GET',
        path: `/apps/${appId}/roles/${roleId}`,
      })
    },
    create(appId: string, body: RoleCreate) {
      return adminRequest<AdminAppRole>(runtime, {
        method: 'POST',
        path: `/apps/${appId}/roles`,
        body,
      })
    },
    update(appId: string, roleId: string, body: RoleUpdate) {
      return adminRequest<AdminAppRole>(runtime, {
        method: 'PATCH',
        path: `/apps/${appId}/roles/${roleId}`,
        body,
      })
    },
    delete(appId: string, roleId: string) {
      return adminRequest<Deleted<'app_role'>>(runtime, {
        method: 'DELETE',
        path: `/apps/${appId}/roles/${roleId}`,
      })
    },
  }

  const orgAppRoles = {
    list(orgId: string, appId: string) {
      return adminRequest<ListResponse<AdminAppRole>>(runtime, {
        method: 'GET',
        path: `/organizations/${orgId}/apps/${appId}/roles`,
      })
    },
    retrieve(orgId: string, appId: string, roleId: string) {
      return adminRequest<AdminAppRole>(runtime, {
        method: 'GET',
        path: `/organizations/${orgId}/apps/${appId}/roles/${roleId}`,
      })
    },
    create(orgId: string, appId: string, body: RoleCreate) {
      return adminRequest<AdminAppRole>(runtime, {
        method: 'POST',
        path: `/organizations/${orgId}/apps/${appId}/roles`,
        body,
      })
    },
    update(orgId: string, appId: string, roleId: string, body: RoleUpdate) {
      return adminRequest<AdminAppRole>(runtime, {
        method: 'PATCH',
        path: `/organizations/${orgId}/apps/${appId}/roles/${roleId}`,
        body,
      })
    },
    delete(orgId: string, appId: string, roleId: string) {
      return adminRequest<Deleted<'app_role'>>(runtime, {
        method: 'DELETE',
        path: `/organizations/${orgId}/apps/${appId}/roles/${roleId}`,
      })
    },
  }

  const appMemberships = {
    list(
      orgId: string,
      params: {
        userId?: string
        appId?: string
        appSlug?: string
        membershipId?: string
        status?: string
        includeRevoked?: boolean
      } = {}
    ) {
      return adminRequest<ListResponse<AdminAppMembership>>(runtime, {
        method: 'GET',
        path: `/organizations/${orgId}/app-memberships`,
        query: {
          user_id: params.userId,
          app_id: params.appId,
          app_slug: params.appSlug,
          membership_id: params.membershipId,
          status: params.status,
          include_revoked: params.includeRevoked,
        },
      })
    },
    retrieve(orgId: string, assignmentId: string) {
      return adminRequest<AdminAppMembership>(runtime, {
        method: 'GET',
        path: `/organizations/${orgId}/app-memberships/${assignmentId}`,
      })
    },
    create(orgId: string, body: MembershipCreate) {
      return adminRequest<AdminAppMembership>(runtime, {
        method: 'POST',
        path: `/organizations/${orgId}/app-memberships`,
        body,
      })
    },
    update(orgId: string, assignmentId: string, body: MembershipUpdate) {
      return adminRequest<AdminAppMembership>(runtime, {
        method: 'PATCH',
        path: `/organizations/${orgId}/app-memberships/${assignmentId}`,
        body,
      })
    },
    delete(orgId: string, assignmentId: string) {
      return adminRequest<Deleted<'app_membership'>>(runtime, {
        method: 'DELETE',
        path: `/organizations/${orgId}/app-memberships/${assignmentId}`,
      })
    },
    listForMember(orgId: string, membershipId: string) {
      return adminRequest<ListResponse<AdminAppMembership>>(runtime, {
        method: 'GET',
        path: `/organizations/${orgId}/members/${membershipId}/app-memberships`,
      })
    },
    listForApp(orgId: string, appId: string) {
      return adminRequest<ListResponse<AdminAppMembership>>(runtime, {
        method: 'GET',
        path: `/organizations/${orgId}/apps/${appId}/members`,
      })
    },
  }

  return { appPermissions, appRoles, orgAppRoles, appMemberships }
}
