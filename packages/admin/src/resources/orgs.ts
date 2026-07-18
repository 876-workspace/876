import { adminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import type {
  AdminAppAssignment,
  AdminAppAssignmentCreateParams,
  AdminDeletedEmployeeProfile,
  AdminDeletedOrgContact,
  AdminDeletedOrgRole,
  AdminDeletedOrgDepartment,
  AdminDeletedOrganization,
  AdminDeletedOrgLocation,
  AdminEmployeeProfile,
  AdminEmployeeProfileCreateParams,
  AdminEmployeeProfileUpdateParams,
  AdminInviteCreateParams,
  AdminInviteToken,
  AdminListResponse,
  AdminMembership,
  AdminOrganization,
  AdminOrganizationCreateParams,
  AdminOrganizationUpdateParams,
  AdminOrgContact,
  AdminOrgContactCreateParams,
  AdminOrgContactUpdateParams,
  AdminOrgDepartment,
  AdminOrgDepartmentCreateParams,
  AdminOrgDepartmentUpdateParams,
  AdminOrgLocation,
  AdminOrgLocationCreateParams,
  AdminOrgLocationUpdateParams,
  AdminOrgMember,
  AdminOrgRole,
  AdminOrgRoleCreateParams,
  AdminOrgRoleUpdateParams,
  AdminOrgSetupParams,
  AdminPermissionCatalog,
  AdminSearchResponse,
  AdminSubscription,
  AdminSubscriptionBatch,
  AdminSubscriptionStatus,
} from '../types'

/** `$876.orgs.*` — platform-wide organization administration. */
export function createAdminOrgsResource(runtime: AdminRuntime) {
  return {
    /**
     * Creates an organization object.
     *
     * @param params - The parameters to create the organization with.
     * @returns A result containing the created organization, or an error.
     */
    create(params: AdminOrganizationCreateParams) {
      return adminRequest<AdminOrganization>(runtime, {
        method: 'POST',
        path: '/organizations',
        body: params,
      })
    },

    /**
     * Returns a list of organizations.
     *
     * @param params - Optional pagination and filtering parameters.
     * @returns A result containing a list object of organizations, or an error.
     */
    list(params?: {
      limit?: number
      starting_after?: string
      ending_before?: string
      search?: string
      include_deleted?: boolean
      /** Filter to organizations with this exact status (e.g. `active`, `suspended`, `archived`). */
      status?: string
    }) {
      return adminRequest<AdminListResponse<AdminOrganization>>(runtime, {
        method: 'GET',
        path: '/organizations',
        query: params as Record<string, string | number | boolean | undefined>,
      })
    },

    /**
     * Retrieves an organization by ID.
     *
     * @param orgId - The ID of the organization to retrieve.
     * @param params - Optional query params (e.g. include_deleted).
     * @returns A result containing the organization, or an error.
     */
    retrieve(orgId: string, params?: { include_deleted?: boolean }) {
      return adminRequest<AdminOrganization>(runtime, {
        method: 'GET',
        path: `/organizations/${orgId}`,
        query: params as Record<string, string | number | boolean | undefined>,
      })
    },

    /**
     * Retrieves an organization by slug.
     *
     * @param slug - The organization slug to look up.
     * @param params - Optional query params (e.g. include_deleted).
     * @returns A result containing the organization, or an error.
     */
    retrieveBySlug(slug: string, params?: { include_deleted?: boolean }) {
      return adminRequest<AdminOrganization>(runtime, {
        method: 'GET',
        path: `/organizations/by-slug/${slug}`,
        query: params as Record<string, string | number | boolean | undefined>,
      })
    },

    /**
     * Searches organizations by name or slug.
     *
     * @param params - The search query and optional limit.
     * @returns A result containing matching organizations, or an error.
     */
    search(params: { query: string; limit?: number; status?: string }) {
      return adminRequest<AdminSearchResponse<AdminOrganization>>(runtime, {
        method: 'GET',
        path: '/organizations/search',
        query: params,
      })
    },

    /**
     * Updates an organization.
     *
     * @param orgId - The ID of the organization to update.
     * @param body - The fields to update.
     * @returns A result containing the updated organization, or an error.
     */
    update(orgId: string, body: AdminOrganizationUpdateParams) {
      return adminRequest<AdminOrganization>(runtime, {
        method: 'PATCH',
        path: `/organizations/${orgId}`,
        body,
      })
    },

    /**
     * Soft-deletes an organization. The record is retained in the database and
     * remains visible to admins via `include_deleted`. Use `purge` to hard-delete.
     *
     * @param orgId - The ID of the organization to delete.
     * @param options - Optional: deletedBy, reason.
     * @returns A result containing a deletion tombstone, or an error.
     */
    delete(orgId: string, options?: { deletedBy?: string; reason?: string }) {
      return adminRequest<AdminDeletedOrganization>(runtime, {
        method: 'DELETE',
        path: `/organizations/${orgId}`,
        query: options
          ? {
              deleted_by: options.deletedBy,
              reason: options.reason,
            }
          : undefined,
      })
    },

    /**
     * Permanently removes an organization record from the database. Cannot be undone.
     * Use `delete` instead to soft-delete and retain the record.
     *
     * @param orgId - The ID of the organization to purge.
     * @param options - Optional: deletedBy (admin user ID, logged only).
     * @returns A result containing a deletion tombstone, or an error.
     */
    purge(orgId: string, options?: { deletedBy?: string }) {
      return adminRequest<AdminDeletedOrganization>(runtime, {
        method: 'DELETE',
        path: `/organizations/${orgId}/purge`,
        query: options?.deletedBy
          ? { deleted_by: options.deletedBy }
          : undefined,
      })
    },

    /**
     * Returns memberships for an organization.
     *
     * @param orgId - The ID of the organization.
     * @param params - Optional pagination parameters.
     * @returns A result containing a list object of memberships, or an error.
     */
    listMemberships(
      orgId: string,
      params?: {
        limit?: number
        starting_after?: string
        ending_before?: string
      }
    ) {
      return adminRequest<AdminListResponse<AdminMembership>>(runtime, {
        method: 'GET',
        path: `/organizations/${orgId}/memberships`,
        query: params as Record<string, string | number | undefined>,
      })
    },

    /**
     * Creates a membership for a user in an organization.
     *
     * @param orgId - The ID of the organization.
     * @param params - The user ID and optional role/status.
     * @returns A result containing the created membership, or an error.
     */
    createMembership(
      orgId: string,
      params: { userId: string; role?: string; status?: string }
    ) {
      return adminRequest<AdminMembership>(runtime, {
        method: 'POST',
        path: `/organizations/${orgId}/memberships`,
        body: {
          userId: params.userId,
          role: params.role,
          status: params.status,
        },
      })
    },

    /**
     * Completes enrollment setup for an organization.
     * All required fields are enforced server-side.
     *
     * @param params - Organization ID and all required enrollment fields.
     * @returns A result containing the updated organization, or an error.
     */
    setup(params: AdminOrgSetupParams) {
      return adminRequest<AdminOrganization>(runtime, {
        method: 'POST',
        path: '/organizations/setup',
        body: params,
      })
    },

    /**
     * Lists invite tokens for an organization.
     *
     * @param orgId - The ID of the organization.
     * @param params - Optional pagination parameters.
     * @returns A result containing a list of invite tokens, or an error.
     */
    listInvites(
      orgId: string,
      params?: {
        limit?: number
        starting_after?: string
        ending_before?: string
      }
    ) {
      return adminRequest<AdminListResponse<AdminInviteToken>>(runtime, {
        method: 'GET',
        path: `/organizations/${orgId}/invites`,
        query: params as Record<string, string | number | undefined>,
      })
    },

    /**
     * Creates an invite token for an organization.
     *
     * @param orgId - The ID of the organization.
     * @param params - The invitee email and optional role.
     * @returns A result containing the created invite token, or an error.
     */
    createInvite(orgId: string, params: AdminInviteCreateParams) {
      return adminRequest<AdminInviteToken>(runtime, {
        method: 'POST',
        path: `/organizations/${orgId}/invites`,
        body: params,
      })
    },

    /**
     * Revokes a pending invite token.
     *
     * @param orgId - The ID of the organization.
     * @param inviteId - The ID of the invite token to revoke.
     * @returns A result containing the revoked invite token, or an error.
     */
    revokeInvite(orgId: string, inviteId: string) {
      return adminRequest<AdminInviteToken>(runtime, {
        method: 'DELETE',
        path: `/organizations/${orgId}/invites/${inviteId}`,
      })
    },

    /**
     * `$876.orgs.locations.*` — an organization's sites (HQ, branches, offices).
     * Session-tier org routes; the admin tier's internal key bypasses the
     * membership guard.
     */
    locations: {
      /** Creates a location for an organization. */
      create(orgId: string, params: AdminOrgLocationCreateParams) {
        return adminRequest<AdminOrgLocation>(runtime, {
          method: 'POST',
          path: `/organizations/${orgId}/locations`,
          body: params,
        })
      },

      /** Returns all locations for an organization. */
      list(orgId: string) {
        return adminRequest<AdminListResponse<AdminOrgLocation>>(runtime, {
          method: 'GET',
          path: `/organizations/${orgId}/locations`,
        })
      },

      /** Retrieves a location by ID. */
      retrieve(orgId: string, locationId: string) {
        return adminRequest<AdminOrgLocation>(runtime, {
          method: 'GET',
          path: `/organizations/${orgId}/locations/${locationId}`,
        })
      },

      /** Updates a location. */
      update(
        orgId: string,
        locationId: string,
        body: AdminOrgLocationUpdateParams
      ) {
        return adminRequest<AdminOrgLocation>(runtime, {
          method: 'PATCH',
          path: `/organizations/${orgId}/locations/${locationId}`,
          body,
        })
      },

      /** Soft-deletes a location. */
      delete(orgId: string, locationId: string) {
        return adminRequest<AdminDeletedOrgLocation>(runtime, {
          method: 'DELETE',
          path: `/organizations/${orgId}/locations/${locationId}`,
        })
      },
    },

    /**
     * `$876.orgs.contacts.*` — an organization's contact people. Contacts may
     * be linked to a platform member (`user_id`) or stand alone as external
     * (non-member) contacts.
     */
    contacts: {
      /** Creates a contact for an organization. */
      create(orgId: string, params: AdminOrgContactCreateParams) {
        return adminRequest<AdminOrgContact>(runtime, {
          method: 'POST',
          path: `/organizations/${orgId}/contacts`,
          body: params,
        })
      },

      /** Returns all contacts for an organization (primary first). */
      list(orgId: string) {
        return adminRequest<AdminListResponse<AdminOrgContact>>(runtime, {
          method: 'GET',
          path: `/organizations/${orgId}/contacts`,
        })
      },

      /** Retrieves a contact by ID. */
      retrieve(orgId: string, contactId: string) {
        return adminRequest<AdminOrgContact>(runtime, {
          method: 'GET',
          path: `/organizations/${orgId}/contacts/${contactId}`,
        })
      },

      /** Updates a contact. */
      update(
        orgId: string,
        contactId: string,
        body: AdminOrgContactUpdateParams
      ) {
        return adminRequest<AdminOrgContact>(runtime, {
          method: 'PATCH',
          path: `/organizations/${orgId}/contacts/${contactId}`,
          body,
        })
      },

      /** Soft-deletes a contact. */
      delete(orgId: string, contactId: string) {
        return adminRequest<AdminDeletedOrgContact>(runtime, {
          method: 'DELETE',
          path: `/organizations/${orgId}/contacts/${contactId}`,
        })
      },
    },

    /**
     * `$876.orgs.departments.*` — an organization's departments (nested via
     * `parent_department_id`).
     */
    departments: {
      /** Creates a department within an organization. */
      create(orgId: string, params: AdminOrgDepartmentCreateParams) {
        return adminRequest<AdminOrgDepartment>(runtime, {
          method: 'POST',
          path: `/organizations/${orgId}/departments`,
          body: params,
        })
      },

      /** Returns all departments for an organization. */
      list(orgId: string) {
        return adminRequest<AdminListResponse<AdminOrgDepartment>>(runtime, {
          method: 'GET',
          path: `/organizations/${orgId}/departments`,
        })
      },

      /** Retrieves a department by ID. */
      retrieve(orgId: string, departmentId: string) {
        return adminRequest<AdminOrgDepartment>(runtime, {
          method: 'GET',
          path: `/organizations/${orgId}/departments/${departmentId}`,
        })
      },

      /** Updates a department. */
      update(
        orgId: string,
        departmentId: string,
        body: AdminOrgDepartmentUpdateParams
      ) {
        return adminRequest<AdminOrgDepartment>(runtime, {
          method: 'PATCH',
          path: `/organizations/${orgId}/departments/${departmentId}`,
          body,
        })
      },

      /** Soft-deletes a department. */
      delete(orgId: string, departmentId: string) {
        return adminRequest<AdminDeletedOrgDepartment>(runtime, {
          method: 'DELETE',
          path: `/organizations/${orgId}/departments/${departmentId}`,
        })
      },
    },

    /**
     * `$876.orgs.employees.*` — employment records (1:1 with memberships):
     * job title, department, location, manager, SCIM enterprise fields.
     */
    employees: {
      /** Creates the employee profile for an org membership. */
      create(orgId: string, params: AdminEmployeeProfileCreateParams) {
        return adminRequest<AdminEmployeeProfile>(runtime, {
          method: 'POST',
          path: `/organizations/${orgId}/employees`,
          body: params,
        })
      },

      /** Returns all employee profiles for an organization. */
      list(orgId: string) {
        return adminRequest<AdminListResponse<AdminEmployeeProfile>>(runtime, {
          method: 'GET',
          path: `/organizations/${orgId}/employees`,
        })
      },

      /** Retrieves an employee profile by ID. */
      retrieve(orgId: string, profileId: string) {
        return adminRequest<AdminEmployeeProfile>(runtime, {
          method: 'GET',
          path: `/organizations/${orgId}/employees/${profileId}`,
        })
      },

      /** Updates an employee profile. */
      update(
        orgId: string,
        profileId: string,
        body: AdminEmployeeProfileUpdateParams
      ) {
        return adminRequest<AdminEmployeeProfile>(runtime, {
          method: 'PATCH',
          path: `/organizations/${orgId}/employees/${profileId}`,
          body,
        })
      },

      /** Soft-deletes an employee profile. */
      delete(orgId: string, profileId: string) {
        return adminRequest<AdminDeletedEmployeeProfile>(runtime, {
          method: 'DELETE',
          path: `/organizations/${orgId}/employees/${profileId}`,
        })
      },
    },

    subscriptions: {
      provision(
        orgId: string,
        params: { appId?: string; appSlug?: string; priceId?: string }
      ) {
        return adminRequest<AdminSubscription>(runtime, {
          method: 'POST',
          path: `/organizations/${orgId}/apps`,
          body: {
            app_id: params.appId,
            app_slug: params.appSlug,
            price_id: params.priceId,
          },
        })
      },

      update(
        orgId: string,
        appId: string,
        body: {
          status?: AdminSubscriptionStatus
          price_id?: string
          cancel_at_period_end?: boolean
        }
      ) {
        return adminRequest<AdminSubscription>(runtime, {
          method: 'PATCH',
          path: `/organizations/${orgId}/apps/${appId}`,
          body,
        })
      },

      list(orgId: string) {
        return adminRequest<AdminSubscription[]>(runtime, {
          method: 'GET',
          path: `/organizations/${orgId}/apps`,
        })
      },

      retrieve(orgId: string, appId: string) {
        return adminRequest<AdminSubscription>(runtime, {
          method: 'GET',
          path: `/organizations/${orgId}/apps/${appId}`,
        })
      },

      retrieveBySlug(orgId: string, appSlug: string) {
        return adminRequest<AdminSubscription>(runtime, {
          method: 'GET',
          path: `/organizations/${orgId}/apps/by-slug/${appSlug}`,
        })
      },

      listByOrgs(orgIds: string[]) {
        return adminRequest<AdminSubscriptionBatch>(runtime, {
          method: 'GET',
          path: `/organizations/app-access/batch`,
          query: { organization_ids: orgIds.join(',') },
        })
      },
    },

    /** The org-level permission catalog for building custom roles. */
    permissions: {
      /** Retrieves the grouped org permission catalog. */
      retrieve() {
        return adminRequest<AdminPermissionCatalog>(runtime, {
          method: 'GET',
          path: '/organizations/permissions/catalog',
        })
      },
    },

    /**
     * Org roles: seeded system roles (immutable) plus the org's custom roles.
     */
    roles: {
      /** Creates a custom role in an organization. */
      create(orgId: string, params: AdminOrgRoleCreateParams) {
        return adminRequest<AdminOrgRole>(runtime, {
          method: 'POST',
          path: `/organizations/${orgId}/roles`,
          body: params,
        })
      },

      /** Returns an organization's roles (system roles first). */
      list(orgId: string) {
        return adminRequest<AdminListResponse<AdminOrgRole>>(runtime, {
          method: 'GET',
          path: `/organizations/${orgId}/roles`,
        })
      },

      /** Retrieves a role by ID. */
      retrieve(orgId: string, roleId: string) {
        return adminRequest<AdminOrgRole>(runtime, {
          method: 'GET',
          path: `/organizations/${orgId}/roles/${roleId}`,
        })
      },

      /** Updates a custom role (system roles are immutable). */
      update(orgId: string, roleId: string, params: AdminOrgRoleUpdateParams) {
        return adminRequest<AdminOrgRole>(runtime, {
          method: 'PATCH',
          path: `/organizations/${orgId}/roles/${roleId}`,
          body: params,
        })
      },

      /** Deletes an unused custom role. */
      delete(orgId: string, roleId: string) {
        return adminRequest<AdminDeletedOrgRole>(runtime, {
          method: 'DELETE',
          path: `/organizations/${orgId}/roles/${roleId}`,
        })
      },
    },

    /** An organization's member directory (memberships + user identity). */
    members: {
      /** Returns an organization's members. */
      list(orgId: string, params?: { limit?: number }) {
        return adminRequest<AdminListResponse<AdminOrgMember>>(runtime, {
          method: 'GET',
          path: `/organizations/${orgId}/members`,
          query: params as Record<string, string | number | undefined>,
        })
      },

      /** Changes a member's org role (by role name, system or custom). */
      update(orgId: string, membershipId: string, params: { role: string }) {
        return adminRequest<AdminOrgMember>(runtime, {
          method: 'PATCH',
          path: `/organizations/${orgId}/members/${membershipId}`,
          body: params,
        })
      },
    },

    /**
     * Per-member app assignments (user→app grants inside a provisioned org).
     */
    appAssignments: {
      /** Assigns a member to a provisioned app. */
      create(orgId: string, params: AdminAppAssignmentCreateParams) {
        return adminRequest<AdminAppAssignment>(runtime, {
          method: 'POST',
          path: `/organizations/${orgId}/app-assignments`,
          body: params,
        })
      },

      /** Returns an organization's app assignments. */
      list(
        orgId: string,
        params?: {
          user_id?: string
          app_id?: string
          include_revoked?: boolean
        }
      ) {
        return adminRequest<AdminListResponse<AdminAppAssignment>>(runtime, {
          method: 'GET',
          path: `/organizations/${orgId}/app-assignments`,
          query: params as Record<string, string | boolean | undefined>,
        })
      },

      /** Revokes an app assignment (returns it with `status: "revoked"`). */
      revoke(orgId: string, assignmentId: string) {
        return adminRequest<AdminAppAssignment>(runtime, {
          method: 'DELETE',
          path: `/organizations/${orgId}/app-assignments/${assignmentId}`,
        })
      },
    },
  }
}
