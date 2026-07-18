import { adminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import type {
  AdminDeletedMembership,
  AdminListResponse,
  AdminMembership,
  AdminMembershipCreateParams,
  AdminMembershipUpdateParams,
} from '../types'

/** `$876.memberships.*` — platform-wide membership administration. */
export function createAdminMembershipsResource(runtime: AdminRuntime) {
  return {
    /**
     * Creates a membership linking a user to an organization.
     *
     * @param params - Organization ID, user ID, and optional role/status.
     * @returns A result containing the created membership, or an error.
     */
    create(params: AdminMembershipCreateParams) {
      return adminRequest<AdminMembership>(runtime, {
        method: 'POST',
        path: '/memberships',
        body: params,
      })
    },

    /**
     * Returns a paginated list of memberships.
     *
     * @param params - Optional filters and pagination.
     * @returns A result containing a list object of memberships, or an error.
     */
    list(params?: {
      limit?: number
      starting_after?: string
      ending_before?: string
      organization_id?: string
      user_id?: string
    }) {
      return adminRequest<AdminListResponse<AdminMembership>>(runtime, {
        method: 'GET',
        path: '/memberships',
        query: params as Record<string, string | number | undefined>,
      })
    },

    /**
     * Retrieves a membership by ID.
     *
     * @param membershipId - The ID of the membership to retrieve.
     * @returns A result containing the membership, or an error.
     */
    retrieve(membershipId: string) {
      return adminRequest<AdminMembership>(runtime, {
        method: 'GET',
        path: `/memberships/${membershipId}`,
      })
    },

    /**
     * Updates a membership's role, status, or WorkOS membership ID.
     *
     * @param membershipId - The ID of the membership to update.
     * @param body - The fields to update.
     * @returns A result containing the updated membership, or an error.
     */
    update(membershipId: string, body: AdminMembershipUpdateParams) {
      return adminRequest<AdminMembership>(runtime, {
        method: 'PATCH',
        path: `/memberships/${membershipId}`,
        body,
      })
    },

    /**
     * Deletes a membership.
     *
     * @param membershipId - The ID of the membership to delete.
     * @returns A result containing a deletion tombstone, or an error.
     */
    delete(membershipId: string) {
      return adminRequest<AdminDeletedMembership>(runtime, {
        method: 'DELETE',
        path: `/memberships/${membershipId}`,
      })
    },
  }
}
