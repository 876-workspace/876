import { platformRequest } from '../request'
import type { PlatformRuntime } from '../runtime'
import type {
  PlatformInviteToken,
  PlatformList,
  PlatformOrganization,
  PlatformOrganizationProfile,
  PlatformOrgProfileUpdateParams,
  PlatformSubscription,
} from '../types'

/** `platform.orgs.*` — org bootstrap, identity profile, invites, subscriptions. */
export function createPlatformOrgsResource(runtime: PlatformRuntime) {
  return {
    /** Creates an organization owned by an existing user (org bootstrap). */
    create(params: { ownerUserId: string; name: string; slug?: string }) {
      return platformRequest<PlatformOrganization>(runtime, {
        method: 'POST',
        path: '/organizations/bootstrap',
        body: {
          owner_user_id: params.ownerUserId,
          name: params.name,
          slug: params.slug,
        },
      })
    },

    /** Retrieves an organization by id. */
    retrieve(orgId: string) {
      return platformRequest<PlatformOrganization>(runtime, {
        method: 'GET',
        path: `/organizations/${orgId}`,
      })
    },

    /**
     * Retrieves an organization's full identity profile (session-scoped
     * endpoint; requires an active membership). Used to prefill a product
     * app's org settings form.
     */
    retrieveProfile(orgId: string) {
      return platformRequest<PlatformOrganizationProfile>(runtime, {
        method: 'GET',
        path: `/organizations/${encodeURIComponent(orgId)}/profile`,
      })
    },

    /**
     * Updates an organization's identity profile (session-scoped endpoint;
     * requires owner/admin). Only profile fields are writable — status, slug,
     * WorkOS id, and metadata are rejected by the endpoint. Authorization is
     * the calling app's responsibility (this client carries the internal key).
     */
    updateProfile(orgId: string, body: PlatformOrgProfileUpdateParams) {
      return platformRequest<PlatformOrganizationProfile>(runtime, {
        method: 'PATCH',
        path: `/organizations/${encodeURIComponent(orgId)}/profile`,
        body: body as Record<string, unknown>,
      })
    },

    invites: {
      /** Creates an invite token for an organization. */
      create(
        orgId: string,
        params: { email: string; role?: string; sourceAppSlug?: string }
      ) {
        return platformRequest<PlatformInviteToken>(runtime, {
          method: 'POST',
          path: `/organizations/${orgId}/invites`,
          body: {
            email: params.email,
            role: params.role,
            source_app_slug: params.sourceAppSlug,
          },
        })
      },

      /** Lists invite tokens for an organization. */
      list(orgId: string) {
        return platformRequest<PlatformList<PlatformInviteToken>>(runtime, {
          method: 'GET',
          path: `/organizations/${orgId}/invites`,
        })
      },
    },

    subscriptions: {
      /** Lists an organization's app subscriptions. */
      list(orgId: string) {
        return platformRequest<PlatformSubscription[]>(runtime, {
          method: 'GET',
          path: `/organizations/${orgId}/apps`,
        })
      },

      /** Retrieves an org's subscription to an app by the app's slug. */
      retrieveBySlug(orgId: string, appSlug: string) {
        return platformRequest<PlatformSubscription>(runtime, {
          method: 'GET',
          path: `/organizations/${orgId}/apps/by-slug/${appSlug}`,
        })
      },

      /** Provisions (activates) an org's subscription to an app. */
      provision(
        orgId: string,
        params: { appId?: string; appSlug?: string; priceId?: string }
      ) {
        return platformRequest<PlatformSubscription>(runtime, {
          method: 'POST',
          path: `/organizations/${orgId}/apps`,
          body: {
            app_id: params.appId,
            app_slug: params.appSlug,
            price_id: params.priceId,
          },
        })
      },
    },
  }
}
