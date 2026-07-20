import { platformRequest } from '../request'
import type { PlatformRuntime } from '../runtime'
import type {
  PlatformDeletedUserIdentification,
  PlatformList,
  PlatformUser,
  PlatformUserFeature,
  PlatformUserIdentification,
  PlatformUserIdentificationCreateParams,
  PlatformUserIdentificationDiscloseParams,
  PlatformUserIdentificationDisclosure,
  PlatformUserIdentificationUpdateParams,
} from '../types'

/** `platform.users.*` — user bootstrap reads plus sensitive identifications. */
export function createPlatformUsersResource(runtime: PlatformRuntime) {
  return {
    /** Retrieves a user by 876 user id. */
    retrieve(userId: string) {
      return platformRequest<PlatformUser>(runtime, {
        method: 'GET',
        path: `/users/${userId}`,
      })
    },

    /** Retrieves a user by WorkOS user id. */
    retrieveByWorkosId(workosUserId: string) {
      return platformRequest<PlatformUser>(runtime, {
        method: 'GET',
        path: `/users/by-workos-id/${workosUserId}`,
      })
    },

    /** Lists a user's direct feature grants. */
    listFeatures(userId: string) {
      return platformRequest<PlatformList<PlatformUserFeature>>(runtime, {
        method: 'GET',
        path: `/users/${userId}/features`,
      })
    },

    /**
     * `platform.users.identifications.*` — sensitive verified identifiers on
     * a user account (Jamaican TRN, passport, driver's license). Per
     * `.claude/rules/customer-architecture.md`, `list`/`create`/`update`/
     * `delete` only ever return the masked value; the full value is returned
     * solely by `disclose()`, which requires this app to be
     * entitlement-allowlisted for the type AND the given organization to
     * hold an active subscription to this app, and always writes an audit
     * event. The calling app must only request disclosure for accounts that
     * are its own enrolled customers in the acting tenant — core only
     * verifies entitlement, the app verifies the relationship.
     */
    identifications: {
      /** Returns a user's identification records (masked values only). */
      list(userId: string) {
        return platformRequest<PlatformList<PlatformUserIdentification>>(
          runtime,
          {
            method: 'GET',
            path: `/users/${userId}/identifications`,
          }
        )
      },

      /**
       * Adds a verified identifier to a user's account. The value is
       * normalized and validated server-side; only the masked value is
       * returned.
       */
      create(userId: string, params: PlatformUserIdentificationCreateParams) {
        return platformRequest<PlatformUserIdentification>(runtime, {
          method: 'POST',
          path: `/users/${userId}/identifications`,
          body: {
            type: params.type,
            value: params.value,
            country_code: params.countryCode,
          },
        })
      },

      /**
       * Replaces the value of an existing identification and resets its
       * verification state.
       */
      update(
        userId: string,
        type: string,
        params: PlatformUserIdentificationUpdateParams
      ) {
        return platformRequest<PlatformUserIdentification>(runtime, {
          method: 'PATCH',
          path: `/users/${userId}/identifications/${type}`,
          body: {
            value: params.value,
            country_code: params.countryCode,
          },
        })
      },

      /** Deletes an identification record. Follows the platform deletion policy. */
      delete(userId: string, type: string) {
        return platformRequest<PlatformDeletedUserIdentification>(runtime, {
          method: 'DELETE',
          path: `/users/${userId}/identifications/${type}`,
        })
      },

      /**
       * Returns the full, unmasked identification value. Entitlement-gated
       * — see the namespace doc comment above.
       */
      disclose(
        userId: string,
        type: string,
        params: PlatformUserIdentificationDiscloseParams
      ) {
        return platformRequest<PlatformUserIdentificationDisclosure>(runtime, {
          method: 'POST',
          path: `/users/${userId}/identifications/${type}/disclose`,
          body: {
            organization_id: params.organizationId,
            app_slug: params.appSlug,
            reason: params.reason,
          },
        })
      },
    },
  }
}
