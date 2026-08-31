import { adminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import type {
  AdminListResponse,
  DeletedReservedUsername,
  ReservedUsername,
  ReservedUsernameCreateParams,
} from '../types'

/** `$876.reservedUsernames.*` — platform reserved-username catalog (internal-key tier). */
export function createAdminReservedUsernamesResource(runtime: AdminRuntime) {
  return {
    /**
     * Returns all reserved usernames.
     */
    list() {
      return adminRequest<AdminListResponse<ReservedUsername>>(runtime, {
        method: 'GET',
        path: '/users/reserved-usernames',
      })
    },

    /**
     * Adds a username to the reserved list.
     *
     * @param params - username (required) and optional reason.
     */
    create(params: ReservedUsernameCreateParams) {
      return adminRequest<ReservedUsername>(runtime, {
        method: 'POST',
        path: '/users/reserved-usernames',
        body: params,
      })
    },

    /**
     * Removes a username from the reserved list.
     *
     * @param username - The exact username to un-reserve.
     */
    delete(username: string) {
      return adminRequest<DeletedReservedUsername>(runtime, {
        method: 'DELETE',
        path: `/users/reserved-usernames/${encodeURIComponent(username)}`,
      })
    },
  }
}
