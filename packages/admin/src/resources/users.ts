import { adminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import type {
  AdminAccount,
  AdminAddress,
  AdminAddressCreateParams,
  AdminAddressUpdateParams,
  AdminConsumerContact,
  AdminConsumerContactCreateParams,
  AdminConsumerContactUpdateParams,
  AdminConsumerProfile,
  AdminConsumerProfileUpdateParams,
  AdminDeletedAddress,
  AdminDeletedConsumerContact,
  AdminDeletedConsumerProfile,
  AdminDeletedUser,
  AdminDeletedUserFeature,
  AdminListResponse,
  AdminOAuthGrant,
  AdminUserApp,
  AdminSearchResponse,
  SessionRevoke,
  UnlinkedAccount,
  AdminUser,
  AdminUserCreateParams,
  AdminUsernameAvailability,
  AdminUserFeature,
  AdminUserFeatureGrantParams,
  AdminUserFeatureUpdateParams,
  AdminUserUpdateParams,
} from '../types'

/** `$876.users.*` — platform-wide user administration (internal-key tier). */
export function createAdminUsersResource(runtime: AdminRuntime) {
  return {
    /**
     * Creates a user object.
     *
     * @param params - The parameters to create the user with.
     * @returns A result containing the created user, or an error.
     */
    create(params: AdminUserCreateParams) {
      return adminRequest<AdminUser>(runtime, {
        method: 'POST',
        path: '/users',
        body: params,
      })
    },

    /**
     * Returns a list of users.
     *
     * @param params - Optional pagination and filtering parameters.
     * @returns A result containing a list object of users, or an error.
     */
    list(params?: {
      limit?: number
      starting_after?: string
      ending_before?: string
      search?: string
      include_deleted?: boolean
      /**
       * When true, return only users whose dedicated Console role grants
       * access — the "who has Console access" view.
       */
      consoleAccess?: boolean
      /** Filter to users with this exact status (e.g. `active`, `inactive`, `suspended`). */
      status?: string
    }) {
      return adminRequest<AdminListResponse<AdminUser>>(runtime, {
        method: 'GET',
        path: '/users',
        query: params as Record<string, string | number | boolean | undefined>,
      })
    },

    /**
     * Retrieves a user by ID.
     *
     * @param userId - The ID of the user to retrieve.
     * @param params - Optional query params (e.g. include_deleted).
     * @returns A result containing the user, or an error.
     */
    retrieve(userId: string, params?: { include_deleted?: boolean }) {
      return adminRequest<AdminUser>(runtime, {
        method: 'GET',
        path: `/users/${userId}`,
        query: params as Record<string, string | number | boolean | undefined>,
      })
    },

    /**
     * Retrieves a user by WorkOS ID.
     *
     * @param workosUserId - The WorkOS user ID to look up.
     * @returns A result containing the user, or an error.
     */
    retrieveByWorkosId(workosUserId: string) {
      return adminRequest<AdminUser>(runtime, {
        method: 'GET',
        path: `/users/by-workos-id/${workosUserId}`,
      })
    },

    /**
     * Retrieves a user by username.
     *
     * @param username - The username to look up.
     * @param params - Optional query params (e.g. include_deleted).
     * @returns A result containing the user, or an error.
     */
    retrieveByUsername(
      username: string,
      params?: { include_deleted?: boolean }
    ) {
      return adminRequest<AdminUser>(runtime, {
        method: 'GET',
        path: `/users/by-username/${username}`,
        query: params as Record<string, string | number | boolean | undefined>,
      })
    },

    /**
     * Searches users by email, username, or name.
     *
     * @param params - The search query and optional limit.
     * @returns A result containing matching users, or an error.
     */
    search(params: { query: string; limit?: number; status?: string }) {
      return adminRequest<AdminSearchResponse<AdminUser>>(runtime, {
        method: 'GET',
        path: '/users/search',
        query: params,
      })
    },

    /**
     * Updates a user.
     *
     * @param userId - The ID of the user to update.
     * @param body - The fields to update.
     * @returns A result containing the updated user, or an error.
     */
    update(userId: string, body: AdminUserUpdateParams) {
      return adminRequest<AdminUser>(runtime, {
        method: 'PATCH',
        path: `/users/${userId}`,
        body,
      })
    },

    /**
     * Soft-deletes a user. The record is retained in the database and remains
     * visible to admins via `include_deleted`. Use `purge` to hard-delete.
     *
     * @param userId - The ID of the user to delete.
     * @param options - Optional: deletedBy (admin user ID), reason.
     * @returns A result containing a deletion tombstone, or an error.
     */
    delete(userId: string, options?: { deletedBy?: string; reason?: string }) {
      return adminRequest<AdminDeletedUser>(runtime, {
        method: 'DELETE',
        path: `/users/${userId}`,
        query: options
          ? {
              deleted_by: options.deletedBy,
              reason: options.reason,
            }
          : undefined,
      })
    },

    /**
     * Permanently removes a user record from the database. Cannot be undone.
     * Use `delete` instead to soft-delete and retain the record.
     *
     * @param userId - The ID of the user to purge.
     * @param options - Optional: deletedBy (admin user ID, logged only).
     * @returns A result containing a deletion tombstone, or an error.
     */
    purge(userId: string, options?: { deletedBy?: string }) {
      return adminRequest<AdminDeletedUser>(runtime, {
        method: 'DELETE',
        path: `/users/${userId}/purge`,
        query: options?.deletedBy
          ? { deleted_by: options.deletedBy }
          : undefined,
      })
    },

    /**
     * Checks whether a username can be claimed (format + reserved list + already
     * taken, including soft-deleted holders).
     *
     * @param username - The username to check.
     * @param options - Optional: excludeUserId to ignore the user who currently
     *   holds the name (e.g. when editing their own profile).
     * @returns A result containing the availability verdict, or an error.
     */
    checkUsernameAvailability(
      username: string,
      options?: { excludeUserId?: string }
    ) {
      return adminRequest<AdminUsernameAvailability>(runtime, {
        method: 'GET',
        path: '/users/username-availability',
        query: {
          username,
          exclude_user_id: options?.excludeUserId,
        },
      })
    },

    /**
     * Bans a user: blocks every authentication path and immediately revokes
     * their active sessions. Reversible via `unban`.
     *
     * @param userId - The ID of the user to ban.
     * @param options - Optional: reason (stored for admin reference only).
     * @returns A result containing the updated user, or an error.
     */
    ban(userId: string, options?: { reason?: string | null }) {
      return adminRequest<AdminUser>(runtime, {
        method: 'POST',
        path: `/users/${userId}/ban`,
        body: { reason: options?.reason ?? null },
      })
    },

    /**
     * Lifts a user's ban, restoring their ability to sign in and clearing the
     * stored ban reason.
     *
     * @param userId - The ID of the user to unban.
     * @returns A result containing the updated user, or an error.
     */
    unban(userId: string) {
      return adminRequest<AdminUser>(runtime, {
        method: 'POST',
        path: `/users/${userId}/unban`,
      })
    },

    createProfile(userId: string, params: AdminConsumerProfileUpdateParams) {
      return adminRequest<AdminConsumerProfile>(runtime, {
        method: 'POST',
        path: `/users/${userId}/profile`,
        body: params,
      })
    },

    retrieveProfile(userId: string) {
      return adminRequest<AdminConsumerProfile>(runtime, {
        method: 'GET',
        path: `/users/${userId}/profile`,
      })
    },

    updateProfile(userId: string, params: AdminConsumerProfileUpdateParams) {
      return adminRequest<AdminConsumerProfile>(runtime, {
        method: 'PATCH',
        path: `/users/${userId}/profile`,
        body: params,
      })
    },

    deleteProfile(userId: string) {
      return adminRequest<AdminDeletedConsumerProfile>(runtime, {
        method: 'DELETE',
        path: `/users/${userId}/profile`,
      })
    },

    listAddresses(userId: string) {
      return adminRequest<AdminListResponse<AdminAddress>>(runtime, {
        method: 'GET',
        path: `/users/${userId}/addresses`,
      })
    },

    createAddress(userId: string, params: AdminAddressCreateParams) {
      return adminRequest<AdminAddress>(runtime, {
        method: 'POST',
        path: `/users/${userId}/addresses`,
        body: params,
      })
    },

    retrieveAddress(userId: string, addressId: string) {
      return adminRequest<AdminAddress>(runtime, {
        method: 'GET',
        path: `/users/${userId}/addresses/${addressId}`,
      })
    },

    updateAddress(
      userId: string,
      addressId: string,
      params: AdminAddressUpdateParams
    ) {
      return adminRequest<AdminAddress>(runtime, {
        method: 'PATCH',
        path: `/users/${userId}/addresses/${addressId}`,
        body: params,
      })
    },

    deleteAddress(userId: string, addressId: string) {
      return adminRequest<AdminDeletedAddress>(runtime, {
        method: 'DELETE',
        path: `/users/${userId}/addresses/${addressId}`,
      })
    },

    listAccounts(userId: string) {
      return adminRequest<AdminListResponse<AdminAccount>>(runtime, {
        method: 'GET',
        path: `/users/${userId}/accounts`,
      })
    },

    listContacts(userId: string) {
      return adminRequest<AdminListResponse<AdminConsumerContact>>(runtime, {
        method: 'GET',
        path: `/users/${userId}/contacts`,
      })
    },

    createContact(userId: string, params: AdminConsumerContactCreateParams) {
      return adminRequest<AdminConsumerContact>(runtime, {
        method: 'POST',
        path: `/users/${userId}/contacts`,
        body: params,
      })
    },

    retrieveContact(userId: string, contactId: string) {
      return adminRequest<AdminConsumerContact>(runtime, {
        method: 'GET',
        path: `/users/${userId}/contacts/${contactId}`,
      })
    },

    updateContact(
      userId: string,
      contactId: string,
      params: AdminConsumerContactUpdateParams
    ) {
      return adminRequest<AdminConsumerContact>(runtime, {
        method: 'PATCH',
        path: `/users/${userId}/contacts/${contactId}`,
        body: params,
      })
    },

    deleteContact(userId: string, contactId: string) {
      return adminRequest<AdminDeletedConsumerContact>(runtime, {
        method: 'DELETE',
        path: `/users/${userId}/contacts/${contactId}`,
      })
    },

    backfillUsernames() {
      return adminRequest<{ updated: number; ids: string[] }>(runtime, {
        method: 'POST',
        path: '/users/backfill-usernames',
      })
    },

    listFeatures(userId: string) {
      return adminRequest<AdminListResponse<AdminUserFeature>>(runtime, {
        method: 'GET',
        path: `/features/users/${userId}/features`,
      })
    },

    grantFeature(userId: string, params: AdminUserFeatureGrantParams) {
      return adminRequest<AdminUserFeature>(runtime, {
        method: 'POST',
        path: `/features/users/${userId}/features`,
        body: params,
      })
    },

    updateFeature(
      userId: string,
      featureId: string,
      params: AdminUserFeatureUpdateParams
    ) {
      return adminRequest<AdminUserFeature>(runtime, {
        method: 'PATCH',
        path: `/features/users/${userId}/features/${featureId}`,
        body: params,
      })
    },

    revokeFeature(userId: string, featureId: string) {
      return adminRequest<AdminDeletedUserFeature>(runtime, {
        method: 'DELETE',
        path: `/features/users/${userId}/features/${featureId}`,
      })
    },

    listOAuthGrants(userId: string) {
      return adminRequest<AdminOAuthGrant[]>(runtime, {
        method: 'GET',
        path: `/users/${userId}/oauth-grants`,
      })
    },

    listApps(userId: string) {
      return adminRequest<AdminListResponse<AdminUserApp>>(runtime, {
        method: 'GET',
        path: `/users/${userId}/apps`,
      })
    },

    revokeOAuthGrant(userId: string, grantId: string) {
      return adminRequest<{ revoked: boolean }>(runtime, {
        method: 'POST',
        path: `/users/${userId}/oauth-grants/${grantId}/revoke`,
      })
    },

    /**
     * Removes a linked sign-in provider account from a user.
     *
     * @param userId - The ID of the user.
     * @param accountId - The ID of the account to unlink.
     */
    unlinkAccount(userId: string, accountId: string) {
      return adminRequest<UnlinkedAccount>(runtime, {
        method: 'DELETE',
        path: `/users/${userId}/accounts/${accountId}`,
      })
    },

    /**
     * Immediately invalidates all active sessions for a user, forcing
     * sign-in on all devices. Does not ban the user.
     *
     * @param userId - The ID of the user whose sessions to revoke.
     */
    revokeSessions(userId: string) {
      return adminRequest<SessionRevoke>(runtime, {
        method: 'POST',
        path: `/users/${userId}/sessions/revoke`,
      })
    },
  }
}
