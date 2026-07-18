import { sendAuthRequest } from '../request.ts'
import type { SdkRuntime } from '../request.ts'
import type { RequestOptions, Result } from '../types/api.ts'
import {
  sdk876DeletedEmployeeProfileSchema,
  sdk876OrganizationSchema,
  sdk876OrganizationSelfUpdateParamsSchema,
  sdk876DeletedOrgContactSchema,
  sdk876DeletedOrgDepartmentSchema,
  sdk876DeletedOrgLocationSchema,
  sdk876OrgContactCreateParamsSchema,
  sdk876OrgContactListSchema,
  sdk876OrgContactSchema,
  sdk876OrgContactUpdateParamsSchema,
  sdk876EmployeeProfileCreateParamsSchema,
  sdk876EmployeeProfileListSchema,
  sdk876EmployeeProfileSchema,
  sdk876EmployeeProfileUpdateParamsSchema,
  sdk876OrgDepartmentCreateParamsSchema,
  sdk876OrgDepartmentListSchema,
  sdk876OrgDepartmentSchema,
  sdk876OrgDepartmentUpdateParamsSchema,
  sdk876OrgLocationCreateParamsSchema,
  sdk876OrgLocationListSchema,
  sdk876OrgLocationSchema,
  sdk876OrgLocationUpdateParamsSchema,
  sdk876AppAssignmentCreateParamsSchema,
  sdk876AppAssignmentListSchema,
  sdk876AppAssignmentSchema,
  sdk876DeletedOrgRoleSchema,
  sdk876OrgMemberListSchema,
  sdk876OrgMemberMeSchema,
  sdk876OrgMemberRoleUpdateParamsSchema,
  sdk876OrgMemberSchema,
  sdk876OrgRoleCreateParamsSchema,
  sdk876OrgRoleListSchema,
  sdk876OrgRoleSchema,
  sdk876OrgRoleUpdateParamsSchema,
  sdk876PermissionCatalogSchema,
} from '../types/orgs.ts'
import type {
  DeletedEmployeeProfile,
  Organization,
  OrganizationSelfUpdateParams,
  DeletedOrgContact,
  DeletedOrgDepartment,
  DeletedOrgLocation,
  OrgContact,
  OrgContactCreateParams,
  OrgContactList,
  OrgContactUpdateParams,
  EmployeeProfile,
  EmployeeProfileCreateParams,
  EmployeeProfileList,
  EmployeeProfileUpdateParams,
  OrgDepartment,
  OrgDepartmentCreateParams,
  OrgDepartmentList,
  OrgDepartmentUpdateParams,
  OrgLocation,
  OrgLocationCreateParams,
  OrgLocationList,
  OrgLocationUpdateParams,
  AppAssignment,
  AppAssignmentCreateParams,
  AppAssignmentList,
  DeletedOrgRole,
  OrgMember,
  OrgMemberList,
  OrgMemberMe,
  OrgMemberRoleUpdateParams,
  OrgRole,
  OrgRoleCreateParams,
  OrgRoleList,
  OrgRoleUpdateParams,
  PermissionCatalog,
} from '../types/orgs.ts'
import { validateParams } from '../validation.ts'

/**
 * `$876.orgs.*` — org-self-scoped organization structure for product apps
 * (Enterprise, Couriers, future apps).
 *
 * Every method targets the caller's OWN organization: the backing session-tier
 * endpoints require an active membership in `orgId` (mutations require the
 * owner/admin role). Platform-wide administration lives in `@876/admin`.
 */
export function createOrgsResource(runtime: SdkRuntime) {
  return {
    /**
     * Retrieves the caller's organization record (business identity, contact,
     * address, locale).
     *
     * @see GET /organizations/{org_id}/details
     */
    retrieve(
      orgId: string,
      requestOptions?: RequestOptions
    ): Promise<Result<Organization>> {
      return sendAuthRequest(
        runtime,
        'GET',
        `/organizations/${orgId}/details`,
        undefined,
        sdk876OrganizationSchema,
        requestOptions
      )
    },

    /**
     * Updates the caller's organization profile. Platform-controlled fields
     * (slug, status) are not updatable here.
     *
     * @see PATCH /organizations/{org_id}/details
     */
    update(
      orgId: string,
      params: OrganizationSelfUpdateParams,
      requestOptions?: RequestOptions
    ): Promise<Result<Organization>> {
      const validation = validateParams(
        sdk876OrganizationSelfUpdateParamsSchema,
        params
      )
      if (validation.error) return Promise.resolve(validation)
      return sendAuthRequest(
        runtime,
        'PATCH',
        `/organizations/${orgId}/details`,
        validation.data,
        sdk876OrganizationSchema,
        requestOptions
      )
    },

    /** An organization's sites — HQ, branches, offices, warehouses. */
    locations: {
      /**
       * Creates a location in the caller's organization.
       *
       * @see POST /organizations/{org_id}/locations
       */
      create(
        orgId: string,
        params: OrgLocationCreateParams,
        requestOptions?: RequestOptions
      ): Promise<Result<OrgLocation>> {
        const validation = validateParams(
          sdk876OrgLocationCreateParamsSchema,
          params
        )
        if (validation.error) return Promise.resolve(validation)
        return sendAuthRequest(
          runtime,
          'POST',
          `/organizations/${orgId}/locations`,
          validation.data,
          sdk876OrgLocationSchema,
          requestOptions
        )
      },

      /**
       * Returns the caller's organization's locations.
       *
       * @see GET /organizations/{org_id}/locations
       */
      list(
        orgId: string,
        requestOptions?: RequestOptions
      ): Promise<Result<OrgLocationList>> {
        return sendAuthRequest(
          runtime,
          'GET',
          `/organizations/${orgId}/locations`,
          undefined,
          sdk876OrgLocationListSchema,
          requestOptions
        )
      },

      /**
       * Retrieves a location by ID.
       *
       * @see GET /organizations/{org_id}/locations/{location_id}
       */
      retrieve(
        orgId: string,
        locationId: string,
        requestOptions?: RequestOptions
      ): Promise<Result<OrgLocation>> {
        return sendAuthRequest(
          runtime,
          'GET',
          `/organizations/${orgId}/locations/${locationId}`,
          undefined,
          sdk876OrgLocationSchema,
          requestOptions
        )
      },

      /**
       * Updates a location.
       *
       * @see PATCH /organizations/{org_id}/locations/{location_id}
       */
      update(
        orgId: string,
        locationId: string,
        params: OrgLocationUpdateParams,
        requestOptions?: RequestOptions
      ): Promise<Result<OrgLocation>> {
        const validation = validateParams(
          sdk876OrgLocationUpdateParamsSchema,
          params
        )
        if (validation.error) return Promise.resolve(validation)
        return sendAuthRequest(
          runtime,
          'PATCH',
          `/organizations/${orgId}/locations/${locationId}`,
          validation.data,
          sdk876OrgLocationSchema,
          requestOptions
        )
      },

      /**
       * Soft-deletes a location.
       *
       * @see DELETE /organizations/{org_id}/locations/{location_id}
       */
      delete(
        orgId: string,
        locationId: string,
        requestOptions?: RequestOptions
      ): Promise<Result<DeletedOrgLocation>> {
        return sendAuthRequest(
          runtime,
          'DELETE',
          `/organizations/${orgId}/locations/${locationId}`,
          undefined,
          sdk876DeletedOrgLocationSchema,
          requestOptions
        )
      },
    },

    /**
     * An organization's contact people. Contacts may be linked to a platform
     * member (`user_id`, must be an active org member) or stand alone as
     * external (non-member) contacts.
     */
    contacts: {
      /**
       * Creates a contact in the caller's organization.
       *
       * @see POST /organizations/{org_id}/contacts
       */
      create(
        orgId: string,
        params: OrgContactCreateParams,
        requestOptions?: RequestOptions
      ): Promise<Result<OrgContact>> {
        const validation = validateParams(
          sdk876OrgContactCreateParamsSchema,
          params
        )
        if (validation.error) return Promise.resolve(validation)
        return sendAuthRequest(
          runtime,
          'POST',
          `/organizations/${orgId}/contacts`,
          validation.data,
          sdk876OrgContactSchema,
          requestOptions
        )
      },

      /**
       * Returns the caller's organization's contacts (primary first).
       *
       * @see GET /organizations/{org_id}/contacts
       */
      list(
        orgId: string,
        requestOptions?: RequestOptions
      ): Promise<Result<OrgContactList>> {
        return sendAuthRequest(
          runtime,
          'GET',
          `/organizations/${orgId}/contacts`,
          undefined,
          sdk876OrgContactListSchema,
          requestOptions
        )
      },

      /**
       * Retrieves a contact by ID.
       *
       * @see GET /organizations/{org_id}/contacts/{contact_id}
       */
      retrieve(
        orgId: string,
        contactId: string,
        requestOptions?: RequestOptions
      ): Promise<Result<OrgContact>> {
        return sendAuthRequest(
          runtime,
          'GET',
          `/organizations/${orgId}/contacts/${contactId}`,
          undefined,
          sdk876OrgContactSchema,
          requestOptions
        )
      },

      /**
       * Updates a contact.
       *
       * @see PATCH /organizations/{org_id}/contacts/{contact_id}
       */
      update(
        orgId: string,
        contactId: string,
        params: OrgContactUpdateParams,
        requestOptions?: RequestOptions
      ): Promise<Result<OrgContact>> {
        const validation = validateParams(
          sdk876OrgContactUpdateParamsSchema,
          params
        )
        if (validation.error) return Promise.resolve(validation)
        return sendAuthRequest(
          runtime,
          'PATCH',
          `/organizations/${orgId}/contacts/${contactId}`,
          validation.data,
          sdk876OrgContactSchema,
          requestOptions
        )
      },

      /**
       * Soft-deletes a contact.
       *
       * @see DELETE /organizations/{org_id}/contacts/{contact_id}
       */
      delete(
        orgId: string,
        contactId: string,
        requestOptions?: RequestOptions
      ): Promise<Result<DeletedOrgContact>> {
        return sendAuthRequest(
          runtime,
          'DELETE',
          `/organizations/${orgId}/contacts/${contactId}`,
          undefined,
          sdk876DeletedOrgContactSchema,
          requestOptions
        )
      },
    },

    /** An organization's departments (nested via `parent_department_id`). */
    departments: {
      /**
       * Creates a department in the caller's organization.
       *
       * @see POST /organizations/{org_id}/departments
       */
      create(
        orgId: string,
        params: OrgDepartmentCreateParams,
        requestOptions?: RequestOptions
      ): Promise<Result<OrgDepartment>> {
        const validation = validateParams(
          sdk876OrgDepartmentCreateParamsSchema,
          params
        )
        if (validation.error) return Promise.resolve(validation)
        return sendAuthRequest(
          runtime,
          'POST',
          `/organizations/${orgId}/departments`,
          validation.data,
          sdk876OrgDepartmentSchema,
          requestOptions
        )
      },

      /**
       * Returns the caller's organization's departments.
       *
       * @see GET /organizations/{org_id}/departments
       */
      list(
        orgId: string,
        requestOptions?: RequestOptions
      ): Promise<Result<OrgDepartmentList>> {
        return sendAuthRequest(
          runtime,
          'GET',
          `/organizations/${orgId}/departments`,
          undefined,
          sdk876OrgDepartmentListSchema,
          requestOptions
        )
      },

      /**
       * Retrieves a department by ID.
       *
       * @see GET /organizations/{org_id}/departments/{department_id}
       */
      retrieve(
        orgId: string,
        departmentId: string,
        requestOptions?: RequestOptions
      ): Promise<Result<OrgDepartment>> {
        return sendAuthRequest(
          runtime,
          'GET',
          `/organizations/${orgId}/departments/${departmentId}`,
          undefined,
          sdk876OrgDepartmentSchema,
          requestOptions
        )
      },

      /**
       * Updates a department.
       *
       * @see PATCH /organizations/{org_id}/departments/{department_id}
       */
      update(
        orgId: string,
        departmentId: string,
        params: OrgDepartmentUpdateParams,
        requestOptions?: RequestOptions
      ): Promise<Result<OrgDepartment>> {
        const validation = validateParams(
          sdk876OrgDepartmentUpdateParamsSchema,
          params
        )
        if (validation.error) return Promise.resolve(validation)
        return sendAuthRequest(
          runtime,
          'PATCH',
          `/organizations/${orgId}/departments/${departmentId}`,
          validation.data,
          sdk876OrgDepartmentSchema,
          requestOptions
        )
      },

      /**
       * Soft-deletes a department.
       *
       * @see DELETE /organizations/{org_id}/departments/{department_id}
       */
      delete(
        orgId: string,
        departmentId: string,
        requestOptions?: RequestOptions
      ): Promise<Result<DeletedOrgDepartment>> {
        return sendAuthRequest(
          runtime,
          'DELETE',
          `/organizations/${orgId}/departments/${departmentId}`,
          undefined,
          sdk876DeletedOrgDepartmentSchema,
          requestOptions
        )
      },
    },

    /**
     * Employment records (1:1 with memberships): job title, department,
     * location, manager, and SCIM enterprise fields.
     */
    employees: {
      /**
       * Creates the employee profile for a membership in the caller's org.
       *
       * @see POST /organizations/{org_id}/employees
       */
      create(
        orgId: string,
        params: EmployeeProfileCreateParams,
        requestOptions?: RequestOptions
      ): Promise<Result<EmployeeProfile>> {
        const validation = validateParams(
          sdk876EmployeeProfileCreateParamsSchema,
          params
        )
        if (validation.error) return Promise.resolve(validation)
        return sendAuthRequest(
          runtime,
          'POST',
          `/organizations/${orgId}/employees`,
          validation.data,
          sdk876EmployeeProfileSchema,
          requestOptions
        )
      },

      /**
       * Returns the caller's organization's employee profiles.
       *
       * @see GET /organizations/{org_id}/employees
       */
      list(
        orgId: string,
        requestOptions?: RequestOptions
      ): Promise<Result<EmployeeProfileList>> {
        return sendAuthRequest(
          runtime,
          'GET',
          `/organizations/${orgId}/employees`,
          undefined,
          sdk876EmployeeProfileListSchema,
          requestOptions
        )
      },

      /**
       * Retrieves an employee profile by ID.
       *
       * @see GET /organizations/{org_id}/employees/{profile_id}
       */
      retrieve(
        orgId: string,
        profileId: string,
        requestOptions?: RequestOptions
      ): Promise<Result<EmployeeProfile>> {
        return sendAuthRequest(
          runtime,
          'GET',
          `/organizations/${orgId}/employees/${profileId}`,
          undefined,
          sdk876EmployeeProfileSchema,
          requestOptions
        )
      },

      /**
       * Updates an employee profile.
       *
       * @see PATCH /organizations/{org_id}/employees/{profile_id}
       */
      update(
        orgId: string,
        profileId: string,
        params: EmployeeProfileUpdateParams,
        requestOptions?: RequestOptions
      ): Promise<Result<EmployeeProfile>> {
        const validation = validateParams(
          sdk876EmployeeProfileUpdateParamsSchema,
          params
        )
        if (validation.error) return Promise.resolve(validation)
        return sendAuthRequest(
          runtime,
          'PATCH',
          `/organizations/${orgId}/employees/${profileId}`,
          validation.data,
          sdk876EmployeeProfileSchema,
          requestOptions
        )
      },

      /**
       * Soft-deletes an employee profile.
       *
       * @see DELETE /organizations/{org_id}/employees/{profile_id}
       */
      delete(
        orgId: string,
        profileId: string,
        requestOptions?: RequestOptions
      ): Promise<Result<DeletedEmployeeProfile>> {
        return sendAuthRequest(
          runtime,
          'DELETE',
          `/organizations/${orgId}/employees/${profileId}`,
          undefined,
          sdk876DeletedEmployeeProfileSchema,
          requestOptions
        )
      },
    },

    /**
     * The org-level permission catalog — the valid permission strings custom
     * roles may grant, grouped for display.
     */
    permissions: {
      /**
       * Retrieves the grouped org permission catalog.
       *
       * @see GET /organizations/permissions/catalog
       */
      retrieve(
        requestOptions?: RequestOptions
      ): Promise<Result<PermissionCatalog>> {
        return sendAuthRequest(
          runtime,
          'GET',
          '/organizations/permissions/catalog',
          undefined,
          sdk876PermissionCatalogSchema,
          requestOptions
        )
      },
    },

    /**
     * Org roles: default system roles (owner, admin, billing_manager, member)
     * seeded at org creation, plus the org's custom roles. Reads require
     * membership; mutations require `roles:manage`. System roles are immutable.
     */
    roles: {
      /**
       * Creates a custom role in the caller's organization.
       *
       * @see POST /organizations/{org_id}/roles
       */
      create(
        orgId: string,
        params: OrgRoleCreateParams,
        requestOptions?: RequestOptions
      ): Promise<Result<OrgRole>> {
        const validation = validateParams(
          sdk876OrgRoleCreateParamsSchema,
          params
        )
        if (validation.error) return Promise.resolve(validation)
        return sendAuthRequest(
          runtime,
          'POST',
          `/organizations/${orgId}/roles`,
          validation.data,
          sdk876OrgRoleSchema,
          requestOptions
        )
      },

      /**
       * Returns the organization's roles (system roles first).
       *
       * @see GET /organizations/{org_id}/roles
       */
      list(
        orgId: string,
        requestOptions?: RequestOptions
      ): Promise<Result<OrgRoleList>> {
        return sendAuthRequest(
          runtime,
          'GET',
          `/organizations/${orgId}/roles`,
          undefined,
          sdk876OrgRoleListSchema,
          requestOptions
        )
      },

      /**
       * Retrieves a role by ID.
       *
       * @see GET /organizations/{org_id}/roles/{role_id}
       */
      retrieve(
        orgId: string,
        roleId: string,
        requestOptions?: RequestOptions
      ): Promise<Result<OrgRole>> {
        return sendAuthRequest(
          runtime,
          'GET',
          `/organizations/${orgId}/roles/${roleId}`,
          undefined,
          sdk876OrgRoleSchema,
          requestOptions
        )
      },

      /**
       * Updates a custom role (system roles are immutable).
       *
       * @see PATCH /organizations/{org_id}/roles/{role_id}
       */
      update(
        orgId: string,
        roleId: string,
        params: OrgRoleUpdateParams,
        requestOptions?: RequestOptions
      ): Promise<Result<OrgRole>> {
        const validation = validateParams(
          sdk876OrgRoleUpdateParamsSchema,
          params
        )
        if (validation.error) return Promise.resolve(validation)
        return sendAuthRequest(
          runtime,
          'PATCH',
          `/organizations/${orgId}/roles/${roleId}`,
          validation.data,
          sdk876OrgRoleSchema,
          requestOptions
        )
      },

      /**
       * Deletes an unused custom role.
       *
       * @see DELETE /organizations/{org_id}/roles/{role_id}
       */
      delete(
        orgId: string,
        roleId: string,
        requestOptions?: RequestOptions
      ): Promise<Result<DeletedOrgRole>> {
        return sendAuthRequest(
          runtime,
          'DELETE',
          `/organizations/${orgId}/roles/${roleId}`,
          undefined,
          sdk876DeletedOrgRoleSchema,
          requestOptions
        )
      },
    },

    /**
     * The organization's member directory (memberships joined with user
     * identity fields). Listing requires `members:read`; role changes require
     * `members:manage` (owner-role transitions are owner-only).
     */
    members: {
      /**
       * Returns the organization's members.
       *
       * @see GET /organizations/{org_id}/members
       */
      list(
        orgId: string,
        requestOptions?: RequestOptions
      ): Promise<Result<OrgMemberList>> {
        return sendAuthRequest(
          runtime,
          'GET',
          `/organizations/${orgId}/members`,
          undefined,
          sdk876OrgMemberListSchema,
          requestOptions
        )
      },

      /**
       * Retrieves the caller's own membership with effective permissions —
       * the Enterprise app's permission bootstrap.
       *
       * @see GET /organizations/{org_id}/members/me
       */
      retrieveMe(
        orgId: string,
        requestOptions?: RequestOptions
      ): Promise<Result<OrgMemberMe>> {
        return sendAuthRequest(
          runtime,
          'GET',
          `/organizations/${orgId}/members/me`,
          undefined,
          sdk876OrgMemberMeSchema,
          requestOptions
        )
      },

      /**
       * Changes a member's org role (by role name, system or custom).
       *
       * @see PATCH /organizations/{org_id}/members/{membership_id}
       */
      update(
        orgId: string,
        membershipId: string,
        params: OrgMemberRoleUpdateParams,
        requestOptions?: RequestOptions
      ): Promise<Result<OrgMember>> {
        const validation = validateParams(
          sdk876OrgMemberRoleUpdateParamsSchema,
          params
        )
        if (validation.error) return Promise.resolve(validation)
        return sendAuthRequest(
          runtime,
          'PATCH',
          `/organizations/${orgId}/members/${membershipId}`,
          validation.data,
          sdk876OrgMemberSchema,
          requestOptions
        )
      },
    },

    /**
     * Per-member app assignments (user→app grants inside the org). The org
     * must be provisioned for the app first. Reads require `apps:read`;
     * create/revoke require `apps:assign`.
     */
    appAssignments: {
      /**
       * Assigns a member to a provisioned app (re-activates a revoked grant).
       *
       * @see POST /organizations/{org_id}/app-assignments
       */
      create(
        orgId: string,
        params: AppAssignmentCreateParams,
        requestOptions?: RequestOptions
      ): Promise<Result<AppAssignment>> {
        const validation = validateParams(
          sdk876AppAssignmentCreateParamsSchema,
          params
        )
        if (validation.error) return Promise.resolve(validation)
        return sendAuthRequest(
          runtime,
          'POST',
          `/organizations/${orgId}/app-assignments`,
          validation.data,
          sdk876AppAssignmentSchema,
          requestOptions
        )
      },

      /**
       * Returns the organization's app assignments.
       *
       * @see GET /organizations/{org_id}/app-assignments
       */
      list(
        orgId: string,
        params?: {
          user_id?: string
          app_id?: string
          include_revoked?: boolean
        },
        requestOptions?: RequestOptions
      ): Promise<Result<AppAssignmentList>> {
        const query = new URLSearchParams()
        if (params?.user_id) query.set('user_id', params.user_id)
        if (params?.app_id) query.set('app_id', params.app_id)
        if (params?.include_revoked) query.set('include_revoked', 'true')
        const suffix = query.size > 0 ? `?${query.toString()}` : ''
        return sendAuthRequest(
          runtime,
          'GET',
          `/organizations/${orgId}/app-assignments${suffix}`,
          undefined,
          sdk876AppAssignmentListSchema,
          requestOptions
        )
      },

      /**
       * Revokes an app assignment (returns it with `status: "revoked"`).
       *
       * @see DELETE /organizations/{org_id}/app-assignments/{assignment_id}
       */
      revoke(
        orgId: string,
        assignmentId: string,
        requestOptions?: RequestOptions
      ): Promise<Result<AppAssignment>> {
        return sendAuthRequest(
          runtime,
          'DELETE',
          `/organizations/${orgId}/app-assignments/${assignmentId}`,
          undefined,
          sdk876AppAssignmentSchema,
          requestOptions
        )
      },
    },
  }
}
