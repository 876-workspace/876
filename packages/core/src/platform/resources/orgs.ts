import { platformRequest } from '../request'
import type { PlatformRuntime } from '../runtime'
import type {
  PlatformInviteToken,
  PlatformList,
  PlatformOrgLocation,
  PlatformOrgLocationCreateParams,
  PlatformOrgLocationUpdateParams,
  PlatformOrganization,
  PlatformOrganizationProfile,
  PlatformOrgProfileUpdateParams,
  PlatformSubscription,
} from '../types'

/** Organization transports composed into resource-first client roots. */
export function createPlatformOrgsResource(runtime: PlatformRuntime) {
  return {
    /** Creates an organization created by an existing user (org bootstrap). */
    create(params: {
      creatorUserId: string
      name: string
      slug?: string
      /** The org's single operating currency — every product app inherits it. */
      currencyCode?: string
      language?: string
    }) {
      return platformRequest<PlatformOrganization>(runtime, {
        method: 'POST',
        path: '/organizations/bootstrap',
        body: {
          creator_user_id: params.creatorUserId,
          name: params.name,
          slug: params.slug,
          currency_code: params.currencyCode,
          language: params.language,
        },
      })
    },

    /** Retrieves an organization by id. */
    retrieve(params: { id: string }) {
      return platformRequest<PlatformOrganization>(runtime, {
        method: 'GET',
        path: `/organizations/${params.id}`,
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
     * requires super_admin/admin). Only profile fields are writable — status, slug,
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

    locations: {
      /** Creates an organization location. @see POST /organizations/{org_id}/locations */
      create(orgId: string, params: PlatformOrgLocationCreateParams) {
        return platformRequest<PlatformOrgLocation>(runtime, {
          method: 'POST',
          path: `/organizations/${encodeURIComponent(orgId)}/locations`,
          body: toLocationBody(params),
        })
      },

      /** Lists an organization's locations. @see GET /organizations/{org_id}/locations */
      list(orgId: string) {
        return platformRequest<PlatformList<PlatformOrgLocation>>(runtime, {
          method: 'GET',
          path: `/organizations/${encodeURIComponent(orgId)}/locations`,
        })
      },

      /** Retrieves an organization location. @see GET /organizations/{org_id}/locations/{location_id} */
      retrieve(orgId: string, locationId: string) {
        return platformRequest<PlatformOrgLocation>(runtime, {
          method: 'GET',
          path: `/organizations/${encodeURIComponent(orgId)}/locations/${encodeURIComponent(locationId)}`,
        })
      },

      /** Updates an organization location. @see PATCH /organizations/{org_id}/locations/{location_id} */
      update(
        orgId: string,
        locationId: string,
        params: PlatformOrgLocationUpdateParams
      ) {
        return platformRequest<PlatformOrgLocation>(runtime, {
          method: 'PATCH',
          path: `/organizations/${encodeURIComponent(orgId)}/locations/${encodeURIComponent(locationId)}`,
          body: toLocationBody(params),
        })
      },
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

      /** Revokes a pending invite token for an organization. */
      revoke(orgId: string, inviteId: string) {
        return platformRequest<PlatformInviteToken>(runtime, {
          method: 'DELETE',
          path: `/organizations/${orgId}/invites/${inviteId}`,
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
      list(orgId: string) {
        return platformRequest<PlatformSubscription[]>(runtime, {
          method: 'GET',
          path: `/organizations/${orgId}/apps`,
        })
      },

      retrieve(
        params:
          | { organizationId: string; appId: string }
          | { organizationId: string; appSlug: string }
      ) {
        if ('appSlug' in params) {
          return platformRequest<PlatformSubscription>(runtime, {
            method: 'GET',
            path: `/organizations/${params.organizationId}/apps/by-slug/${params.appSlug}`,
          })
        }
        return platformRequest<PlatformSubscription>(runtime, {
          method: 'GET',
          path: `/organizations/${params.organizationId}/apps/${params.appId}`,
        })
      },

      create(
        orgId: string,
        params: {
          appId?: string
          appSlug?: string
          priceId?: string
          /**
           * Assert the app's required finance dependency. When `'embedded'`,
           * activation fails closed unless the app's published profile declares
           * embedded finance with scopes — a caller that knows an app must have
           * a Billing workspace (876 Invoice) sets this so a misconfigured
           * profile cannot silently downgrade it.
           */
          requireFinance?: 'embedded'
        }
      ) {
        return platformRequest<PlatformSubscription>(runtime, {
          method: 'POST',
          path: `/organizations/${orgId}/apps`,
          body: {
            app_id: params.appId,
            app_slug: params.appSlug,
            price_id: params.priceId,
            require_finance: params.requireFinance,
          },
        })
      },
    },
  }
}

function toLocationBody(
  params: PlatformOrgLocationCreateParams | PlatformOrgLocationUpdateParams
): Record<string, unknown> {
  return {
    name: params.name,
    code: params.code,
    type: params.type,
    status: params.status,
    phone: params.phone,
    email: params.email,
    line1: params.line1,
    line2: params.line2,
    city: params.city,
    region_id: params.regionId,
    country_code: params.countryCode,
    postal_code: params.postalCode,
    timezone: params.timezone,
    metadata: params.metadata,
  }
}
