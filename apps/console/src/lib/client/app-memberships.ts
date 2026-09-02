import { request } from './request'

type AppMembershipMutation = {
  object: 'app_membership'
  id: string
  app_role?: { id: string; key: string; name: string } | null
}

export const appMemberships = {
  create(
    organizationId: string,
    input: { membershipId: string; appId: string; appRoleId: string }
  ) {
    return request<AppMembershipMutation>(
      `/api/organizations/${organizationId}/app-memberships`,
      { method: 'POST', body: JSON.stringify(input) }
    )
  },
  update(
    organizationId: string,
    assignmentId: string,
    input: {
      appRoleId?: string
      permissionGrants?: string[]
      permissionDenies?: string[]
    }
  ) {
    return request<AppMembershipMutation>(
      `/api/organizations/${organizationId}/app-memberships/${assignmentId}`,
      { method: 'PATCH', body: JSON.stringify(input) }
    )
  },
  revoke(organizationId: string, assignmentId: string) {
    return request<{ object: 'app_membership'; id: string; deleted: true }>(
      `/api/organizations/${organizationId}/app-memberships/${assignmentId}`,
      { method: 'DELETE' }
    )
  },
}
