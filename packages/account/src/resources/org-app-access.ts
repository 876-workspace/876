import { sendAuthRequest } from '../request.ts'
import type { SdkRuntime } from '../request.ts'
import type { RequestOptions, Result } from '../types/api.ts'
import {
  sdk876AppMembershipCreateParamsSchema,
  sdk876AppMembershipListSchema,
  sdk876AppMembershipSchema,
  sdk876AppMembershipUpdateParamsSchema,
  sdk876AppRoleListSchema,
  sdk876DeletedAppMembershipSchema,
  type AppMembership,
  type AppMembershipCreateParams,
  type AppMembershipList,
  type AppMembershipUpdateParams,
  type AppRoleList,
  type DeletedAppMembership,
} from '../types/app-memberships.ts'
import { validateParams } from '../validation.ts'

/**
 * Organization-scoped app access at signed-in session authority.
 *
 * These are the same routes Console reaches at operator authority. They are
 * declared `security: 'session'` in the identity API, which authorizes an
 * organization member for reads and requires `apps:assign` for writes — so a
 * product app's own settings surface can manage its members without an operator
 * credential. The API remains the authorization boundary; exposing the resource
 * here only makes the caller's authority visible.
 *
 * Self-scoped reads stay on the Account root as `$876.appMemberships.me`.
 */
export function createOrgAppAccessResources(runtime: SdkRuntime) {
  const orgAppRoles = {
    /**
     * Lists the app roles assignable in this organization for one app.
     *
     * @see GET /organizations/{org_id}/apps/{app_id}/roles
     */
    list(
      orgId: string,
      appId: string,
      requestOptions?: RequestOptions
    ): Promise<Result<AppRoleList>> {
      return sendAuthRequest(
        runtime,
        'GET',
        `/organizations/${encodeURIComponent(orgId)}/apps/${encodeURIComponent(appId)}/roles`,
        undefined,
        sdk876AppRoleListSchema,
        requestOptions
      )
    },
  }

  const appMemberships = {
    /**
     * Lists app memberships across the organization.
     *
     * @see GET /organizations/{org_id}/app-memberships
     */
    list(
      orgId: string,
      params: {
        userId?: string
        appId?: string
        includeRevoked?: boolean
      } = {},
      requestOptions?: RequestOptions
    ): Promise<Result<AppMembershipList>> {
      const query = new URLSearchParams()
      if (params.userId) query.set('user_id', params.userId)
      if (params.appId) query.set('app_id', params.appId)
      if (params.includeRevoked) query.set('include_revoked', 'true')
      const suffix = query.size > 0 ? `?${query.toString()}` : ''

      return sendAuthRequest(
        runtime,
        'GET',
        `/organizations/${encodeURIComponent(orgId)}/app-memberships${suffix}`,
        undefined,
        sdk876AppMembershipListSchema,
        requestOptions
      )
    },

    /**
     * Returns one profile per entitled app for a single organization member.
     *
     * @see GET /organizations/{org_id}/members/{membership_id}/app-memberships
     */
    listForMember(
      orgId: string,
      membershipId: string,
      requestOptions?: RequestOptions
    ): Promise<Result<AppMembershipList>> {
      return sendAuthRequest(
        runtime,
        'GET',
        `/organizations/${encodeURIComponent(orgId)}/members/${encodeURIComponent(membershipId)}/app-memberships`,
        undefined,
        sdk876AppMembershipListSchema,
        requestOptions
      )
    },

    /**
     * Returns the roster of members with access to one app.
     *
     * @see GET /organizations/{org_id}/apps/{app_id}/members
     */
    listForApp(
      orgId: string,
      appId: string,
      requestOptions?: RequestOptions
    ): Promise<Result<AppMembershipList>> {
      return sendAuthRequest(
        runtime,
        'GET',
        `/organizations/${encodeURIComponent(orgId)}/apps/${encodeURIComponent(appId)}/members`,
        undefined,
        sdk876AppMembershipListSchema,
        requestOptions
      )
    },

    /**
     * Retrieves one app membership.
     *
     * @see GET /organizations/{org_id}/app-memberships/{assignment_id}
     */
    retrieve(
      orgId: string,
      assignmentId: string,
      requestOptions?: RequestOptions
    ): Promise<Result<AppMembership>> {
      return sendAuthRequest(
        runtime,
        'GET',
        `/organizations/${encodeURIComponent(orgId)}/app-memberships/${encodeURIComponent(assignmentId)}`,
        undefined,
        sdk876AppMembershipSchema,
        requestOptions
      )
    },

    /**
     * Assigns a member to an app. Requires `apps:assign`.
     *
     * @see POST /organizations/{org_id}/app-memberships
     */
    create(
      orgId: string,
      params: AppMembershipCreateParams,
      requestOptions?: RequestOptions
    ): Promise<Result<AppMembership>> {
      const validation = validateParams(
        sdk876AppMembershipCreateParamsSchema,
        params
      )
      if (validation.error) return Promise.resolve(validation)

      return sendAuthRequest(
        runtime,
        'POST',
        `/organizations/${encodeURIComponent(orgId)}/app-memberships`,
        validation.data,
        sdk876AppMembershipSchema,
        requestOptions
      )
    },

    /**
     * Changes a member's app role or permission overrides. Requires `apps:assign`.
     *
     * @see PATCH /organizations/{org_id}/app-memberships/{assignment_id}
     */
    update(
      orgId: string,
      assignmentId: string,
      params: AppMembershipUpdateParams,
      requestOptions?: RequestOptions
    ): Promise<Result<AppMembership>> {
      const validation = validateParams(
        sdk876AppMembershipUpdateParamsSchema,
        params
      )
      if (validation.error) return Promise.resolve(validation)

      return sendAuthRequest(
        runtime,
        'PATCH',
        `/organizations/${encodeURIComponent(orgId)}/app-memberships/${encodeURIComponent(assignmentId)}`,
        validation.data,
        sdk876AppMembershipSchema,
        requestOptions
      )
    },

    /**
     * Revokes a member's app access. Requires `apps:assign`.
     *
     * @see DELETE /organizations/{org_id}/app-memberships/{assignment_id}
     */
    delete(
      orgId: string,
      assignmentId: string,
      requestOptions?: RequestOptions
    ): Promise<Result<DeletedAppMembership>> {
      return sendAuthRequest(
        runtime,
        'DELETE',
        `/organizations/${encodeURIComponent(orgId)}/app-memberships/${encodeURIComponent(assignmentId)}`,
        undefined,
        sdk876DeletedAppMembershipSchema,
        requestOptions
      )
    },
  }

  return { orgAppRoles, appMemberships }
}
