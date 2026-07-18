import type {
  AdminInviteToken,
  AdminOrgContact,
  AdminOrgContactCreateParams,
  AdminOrgContactUpdateParams,
  AdminOrgLocation,
  AdminOrgLocationCreateParams,
  AdminOrgLocationUpdateParams,
  AdminOrgMember,
} from '@876/admin'
import type { Organization, OrganizationSelfUpdateParams } from '@876/sdk'

import { request } from './request'

/**
 * Updates the current org's company details (self-scoped profile). The route
 * handler authorizes `org:update` on the caller's membership before applying
 * the change, so `slug`/`status` are intentionally not part of this surface.
 */
export const updateDetails = (
  slug: string,
  params: OrganizationSelfUpdateParams
) =>
  request<Organization>(`/api/orgs/${encodeURIComponent(slug)}/details`, {
    method: 'PATCH',
    body: JSON.stringify(params),
  })

export const orgs = {
  updateDetails,

  /** Member invites — creation requires `members:invite` on the caller. */
  invites: {
    create: (slug: string, params: { email: string; role?: string }) =>
      request<AdminInviteToken>(
        `/api/orgs/${encodeURIComponent(slug)}/invites`,
        {
          method: 'POST',
          body: JSON.stringify(params),
        }
      ),

    revoke: (slug: string, inviteId: string) =>
      request<AdminInviteToken>(
        `/api/orgs/${encodeURIComponent(slug)}/invites/${encodeURIComponent(inviteId)}`,
        { method: 'DELETE' }
      ),
  },

  /** Org location (address) mutations — require `structure:manage`. */
  locations: {
    create: (slug: string, params: AdminOrgLocationCreateParams) =>
      request<AdminOrgLocation>(
        `/api/orgs/${encodeURIComponent(slug)}/locations`,
        { method: 'POST', body: JSON.stringify(params) }
      ),

    update: (
      slug: string,
      locationId: string,
      params: AdminOrgLocationUpdateParams
    ) =>
      request<AdminOrgLocation>(
        `/api/orgs/${encodeURIComponent(slug)}/locations/${encodeURIComponent(locationId)}`,
        { method: 'PATCH', body: JSON.stringify(params) }
      ),

    delete: (slug: string, locationId: string) =>
      request<{ id: string; deleted: boolean }>(
        `/api/orgs/${encodeURIComponent(slug)}/locations/${encodeURIComponent(locationId)}`,
        { method: 'DELETE' }
      ),
  },

  /** Org contact mutations — require `org:update`. */
  contacts: {
    create: (slug: string, params: AdminOrgContactCreateParams) =>
      request<AdminOrgContact>(
        `/api/orgs/${encodeURIComponent(slug)}/contacts`,
        { method: 'POST', body: JSON.stringify(params) }
      ),

    update: (
      slug: string,
      contactId: string,
      params: AdminOrgContactUpdateParams
    ) =>
      request<AdminOrgContact>(
        `/api/orgs/${encodeURIComponent(slug)}/contacts/${encodeURIComponent(contactId)}`,
        { method: 'PATCH', body: JSON.stringify(params) }
      ),

    delete: (slug: string, contactId: string) =>
      request<{ id: string; deleted: boolean }>(
        `/api/orgs/${encodeURIComponent(slug)}/contacts/${encodeURIComponent(contactId)}`,
        { method: 'DELETE' }
      ),
  },

  /** Member directory mutations — require `members:manage` on the caller. */
  members: {
    update: (slug: string, membershipId: string, params: { role: string }) =>
      request<AdminOrgMember>(
        `/api/orgs/${encodeURIComponent(slug)}/members/${encodeURIComponent(membershipId)}`,
        { method: 'PATCH', body: JSON.stringify(params) }
      ),

    delete: (slug: string, membershipId: string) =>
      request<{ id: string; deleted: boolean }>(
        `/api/orgs/${encodeURIComponent(slug)}/members/${encodeURIComponent(membershipId)}`,
        { method: 'DELETE' }
      ),
  },
}
