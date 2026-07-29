import type {
  InviteToken,
  OrgContact,
  OrgContactCreateParams,
  OrgContactUpdateParams,
  OrgLocation,
  OrgLocationCreateParams,
  OrgLocationUpdateParams,
  OrgMember,
} from '@876/sdk'
import type { Organization, OrganizationSelfUpdateParams } from '@876/sdk'

import { request } from './request'

/**
 * Updates the current org's company details (self-scoped profile). The route
 * handler authorizes `org:update` on the caller's membership before applying
 * the change, so `slug`/`status` are intentionally not part of this surface.
 */
const updateDetails = (slug: string, params: OrganizationSelfUpdateParams) =>
  request<Organization>(`/api/orgs/${encodeURIComponent(slug)}/details`, {
    method: 'PATCH',
    body: JSON.stringify(params),
  })

export const organizations = {
  update: updateDetails,
}

/** Member invites — creation requires `members:invite` on the caller. */
export const invites = {
  create: (slug: string, params: { email: string; role?: string }) =>
    request<InviteToken>(`/api/orgs/${encodeURIComponent(slug)}/invites`, {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  revoke: (slug: string, inviteId: string) =>
    request<InviteToken>(
      `/api/orgs/${encodeURIComponent(slug)}/invites/${encodeURIComponent(inviteId)}`,
      { method: 'DELETE' }
    ),
}

/** Org location (address) mutations — require `structure:manage`. */
export const locations = {
  create: (slug: string, params: OrgLocationCreateParams) =>
    request<OrgLocation>(`/api/orgs/${encodeURIComponent(slug)}/locations`, {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  update: (slug: string, locationId: string, params: OrgLocationUpdateParams) =>
    request<OrgLocation>(
      `/api/orgs/${encodeURIComponent(slug)}/locations/${encodeURIComponent(locationId)}`,
      { method: 'PATCH', body: JSON.stringify(params) }
    ),

  delete: (slug: string, locationId: string) =>
    request<{ id: string; deleted: boolean }>(
      `/api/orgs/${encodeURIComponent(slug)}/locations/${encodeURIComponent(locationId)}`,
      { method: 'DELETE' }
    ),
}

/** Org contact mutations — require `org:update`. */
export const contacts = {
  create: (slug: string, params: OrgContactCreateParams) =>
    request<OrgContact>(`/api/orgs/${encodeURIComponent(slug)}/contacts`, {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  update: (slug: string, contactId: string, params: OrgContactUpdateParams) =>
    request<OrgContact>(
      `/api/orgs/${encodeURIComponent(slug)}/contacts/${encodeURIComponent(contactId)}`,
      { method: 'PATCH', body: JSON.stringify(params) }
    ),

  delete: (slug: string, contactId: string) =>
    request<{ id: string; deleted: boolean }>(
      `/api/orgs/${encodeURIComponent(slug)}/contacts/${encodeURIComponent(contactId)}`,
      { method: 'DELETE' }
    ),
}

/** Member directory mutations — require `members:manage` on the caller. */
export const organizationMembers = {
  update: (slug: string, membershipId: string, params: { role: string }) =>
    request<OrgMember>(
      `/api/orgs/${encodeURIComponent(slug)}/members/${encodeURIComponent(membershipId)}`,
      { method: 'PATCH', body: JSON.stringify(params) }
    ),

  delete: (slug: string, membershipId: string) =>
    request<{ id: string; deleted: boolean }>(
      `/api/orgs/${encodeURIComponent(slug)}/members/${encodeURIComponent(membershipId)}`,
      { method: 'DELETE' }
    ),
}
