"""Rich Swagger descriptions and response maps for the Organizations domain."""

from __future__ import annotations

from fastapi import status

from core.responses import ErrorEnvelope

_ADMIN_401: dict = {
    status.HTTP_401_UNAUTHORIZED: {
        "model": ErrorEnvelope,
        "description": "Missing or invalid internal key.",
    }
}
_ADMIN_403: dict = {
    status.HTTP_403_FORBIDDEN: {
        "model": ErrorEnvelope,
        "description": "Caller is not an admin.",
    }
}
_ADMIN = {**_ADMIN_401, **_ADMIN_403}

_MEMBER_SESSION: dict = {
    status.HTTP_401_UNAUTHORIZED: {
        "model": ErrorEnvelope,
        "description": "Missing or invalid session.",
    },
    status.HTTP_403_FORBIDDEN: {
        "model": ErrorEnvelope,
        "description": "Caller is not an active member of the organization.",
    },
}

BOOTSTRAP_ORG_SUMMARY = "Bootstrap organization for existing user"
BOOTSTRAP_ORG_DESCRIPTION = """
Creates a WorkOS organization and active owner membership for an existing 876 user. **Admin only**.

* Generates a unique slug from the organization name when omitted.
* Provisions the default organization roles and Enterprise app entitlement.
* Creates the existing user's owner membership with active status.
"""
BOOTSTRAP_ORG_RESPONSES: dict = {
    status.HTTP_400_BAD_REQUEST: {
        "model": ErrorEnvelope,
        "description": "Organization name or provided slug is invalid.",
    },
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "Owner user not found.",
    },
    status.HTTP_409_CONFLICT: {
        "model": ErrorEnvelope,
        "description": "Provided organization slug already exists.",
    },
    **_ADMIN,
}

CREATE_ORG_SUMMARY = "Create organization"
CREATE_ORG_DESCRIPTION = """
Creates a new organization. **Admin only**.

* Validates and normalizes the slug.
* Rejects duplicate slugs and duplicate WorkOS organization IDs.
"""
CREATE_ORG_RESPONSES: dict = {
    status.HTTP_400_BAD_REQUEST: {
        "model": ErrorEnvelope,
        "description": "Invalid slug or missing required fields.",
    },
    status.HTTP_409_CONFLICT: {
        "model": ErrorEnvelope,
        "description": "Slug or WorkOS organization ID already exists.",
    },
    **_ADMIN,
}

CREATE_ORG_MEMBERSHIP_SUMMARY = "Create organization membership"
CREATE_ORG_MEMBERSHIP_DESCRIPTION = """
Creates a membership linking an enterprise user to an organization. **Admin only**.

* User must have `account_type = 'enterprise'`.
* Duplicate memberships (same org + user) are rejected.
"""
CREATE_ORG_MEMBERSHIP_RESPONSES: dict = {
    status.HTTP_400_BAD_REQUEST: {
        "model": ErrorEnvelope,
        "description": "Organization not found or invalid input.",
    },
    status.HTTP_403_FORBIDDEN: {
        "model": ErrorEnvelope,
        "description": "User is not an enterprise account.",
    },
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "User not found.",
    },
    status.HTTP_409_CONFLICT: {
        "model": ErrorEnvelope,
        "description": "User is already a member of this organization.",
    },
    **_ADMIN_401,
}

DELETE_ORG_SUMMARY = "Delete organization"
DELETE_ORG_DESCRIPTION = "Deletes an organization. Returns a deletion tombstone. **Admin only**."
DELETE_ORG_RESPONSES: dict = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "Organization not found.",
    },
    **_ADMIN,
}

LIST_ORG_MEMBERSHIPS_SUMMARY = "List organization memberships"
LIST_ORG_MEMBERSHIPS_DESCRIPTION = "Returns a paginated list of memberships for an organization. **Admin only**."
LIST_ORG_MEMBERSHIPS_RESPONSES: dict = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "Organization not found.",
    },
    **_ADMIN,
}

LIST_ORGS_SUMMARY = "List organizations"
LIST_ORGS_DESCRIPTION = "Returns a paginated list of all organizations. **Admin only**."
LIST_ORGS_RESPONSES: dict = {**_ADMIN}

RETRIEVE_ORG_SUMMARY = "Retrieve organization"
RETRIEVE_ORG_DESCRIPTION = "Returns a single organization by ID. **Admin only**."
RETRIEVE_ORG_RESPONSES: dict = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "Organization not found.",
    },
    **_ADMIN,
}

RETRIEVE_ORG_BY_SLUG_SUMMARY = "Retrieve organization by slug"
RETRIEVE_ORG_BY_SLUG_DESCRIPTION = "Returns a single organization by slug. **Admin only**."
RETRIEVE_ORG_BY_SLUG_RESPONSES: dict = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "Organization not found.",
    },
    **_ADMIN,
}

SEARCH_ORGS_SUMMARY = "Search organizations"
SEARCH_ORGS_DESCRIPTION = "Searches organizations by name or slug. **Admin only**."
SEARCH_ORGS_RESPONSES: dict = {**_ADMIN}

UPDATE_ORG_SUMMARY = "Update organization"
UPDATE_ORG_DESCRIPTION = "Updates an organization's name, slug, status, or metadata. **Admin only**."
UPDATE_ORG_RESPONSES: dict = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "Organization not found.",
    },
    status.HTTP_409_CONFLICT: {
        "model": ErrorEnvelope,
        "description": "New slug or WorkOS ID is already in use.",
    },
    **_ADMIN,
}

# --- App access ---

GET_SUBSCRIPTION_SUMMARY = "Get subscription"
GET_SUBSCRIPTION_DESCRIPTION = "Returns the subscription for a specific app within an organization. **Admin only**."
GET_SUBSCRIPTION_RESPONSES: dict = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "Subscription not found.",
    },
    **_ADMIN,
}

GET_SUBSCRIPTION_BY_SLUG_SUMMARY = "Get subscription by slug"
GET_SUBSCRIPTION_BY_SLUG_DESCRIPTION = "Returns the subscription for a platform app identified by slug. **Admin only**."
GET_SUBSCRIPTION_BY_SLUG_RESPONSES: dict = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "App or subscription not found.",
    },
    **_ADMIN,
}

LIST_ORG_SUBSCRIPTIONS_SUMMARY = "List subscriptions"
LIST_ORG_SUBSCRIPTIONS_DESCRIPTION = "Returns all app subscriptions for an organization. **Admin only**."
LIST_ORG_SUBSCRIPTIONS_RESPONSES: dict = {**_ADMIN}

LIST_MY_ORG_SUBSCRIPTIONS_SUMMARY = "List my organization's subscriptions"
LIST_MY_ORG_SUBSCRIPTIONS_DESCRIPTION = (
    "Returns all app subscriptions for an organization the caller is an active member of. "
    "**Session tier** — used by product apps (Enterprise billing, app gating) without the internal key."
)
LIST_MY_ORG_SUBSCRIPTIONS_RESPONSES: dict = {**_MEMBER_SESSION}

LIST_SUBSCRIPTIONS_BATCH_SUMMARY = "Batch list subscriptions"
LIST_SUBSCRIPTIONS_BATCH_DESCRIPTION = "Returns app subscriptions for multiple organizations in one query. **Admin only**."
LIST_SUBSCRIPTIONS_BATCH_RESPONSES: dict = {**_ADMIN}

PROVISION_SUBSCRIPTION_SUMMARY = "Create subscription"
PROVISION_SUBSCRIPTION_DESCRIPTION = (
    "Grants an organization access to a platform app (upserts active). Defaults to the app's "
    "default price when `price_id` is omitted; an existing subscription's items are never changed "
    "by re-provisioning. **Admin only**."
)
PROVISION_SUBSCRIPTION_RESPONSES: dict = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "Organization or app not found.",
    },
    **_ADMIN,
}

PROVISION_MY_ORG_SUBSCRIPTION_SUMMARY = "Create my organization's subscription"
PROVISION_MY_ORG_SUBSCRIPTION_DESCRIPTION = (
    "Grants the caller's organization access to a platform app (upserts active). The caller must be "
    "an active owner or admin of the organization. Defaults to the app's default price when "
    "`price_id` is omitted. **Session tier** — used by app onboarding/activation flows."
)
PROVISION_MY_ORG_SUBSCRIPTION_RESPONSES: dict = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "Organization or app not found.",
    },
    status.HTTP_422_UNPROCESSABLE_CONTENT: {
        "model": ErrorEnvelope,
        "description": "Neither app_id nor app_slug was provided.",
    },
    **_MEMBER_SESSION,
}

RETRIEVE_MY_ORG_SUBSCRIPTION_BY_SLUG_SUMMARY = "Get my organization's subscription by slug"
RETRIEVE_MY_ORG_SUBSCRIPTION_BY_SLUG_DESCRIPTION = (
    "Returns the caller's organization's subscription for a platform app identified by slug. "
    "The caller must be an active member of the organization. **Session tier** — the app access gate."
)
RETRIEVE_MY_ORG_SUBSCRIPTION_BY_SLUG_RESPONSES: dict = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "No subscription exists for this app.",
    },
    **_MEMBER_SESSION,
}

UPDATE_SUBSCRIPTION_SUMMARY = "Update subscription"
UPDATE_SUBSCRIPTION_DESCRIPTION = (
    "Updates an organization's subscription status, cancellation flag, and/or subscribed price for "
    "an app. At least one of `status`/`cancel_at_period_end`/`price_id` is required. **Admin only**."
)
UPDATE_SUBSCRIPTION_RESPONSES: dict = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "Subscription not found.",
    },
    **_ADMIN,
}


# ── Org structure: locations, departments, employee profiles ─────────────────
#
# All org-structure routes are session-tier with an org-membership guard; the
# internal key (admin tier) bypasses the guard, so Console uses the same routes.

_ORG_404: dict = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "Resource not found in this organization.",
    }
}
_STRUCTURE_READ: dict = {**_MEMBER_SESSION, **_ORG_404}
_STRUCTURE_WRITE_DESC = " The caller must be an active owner or admin of the organization (or the admin tier)."

_CONTACT_WRITE_DESC = (
    " Requires the `org:update` permission on the caller's membership (or the admin tier)."
)

CREATE_ORG_CONTACT_SUMMARY = "Create contact"
CREATE_ORG_CONTACT_DESCRIPTION = (
    "Creates a contact person for the organization. Contacts may be linked to a platform "
    "member via `user_id` or stand alone as external contacts." + _CONTACT_WRITE_DESC
)
CREATE_ORG_CONTACT_RESPONSES: dict = {**_STRUCTURE_READ}

CREATE_ORG_DEPARTMENT_SUMMARY = "Create department"
CREATE_ORG_DEPARTMENT_DESCRIPTION = "Creates a department within the organization." + _STRUCTURE_WRITE_DESC
CREATE_ORG_DEPARTMENT_RESPONSES: dict = {**_STRUCTURE_READ}

CREATE_ORG_EMPLOYEE_SUMMARY = "Create employee profile"
CREATE_ORG_EMPLOYEE_DESCRIPTION = (
    "Creates the employment record for an org membership (1:1). Fails if the membership "
    "already has a profile or belongs to another organization." + _STRUCTURE_WRITE_DESC
)
CREATE_ORG_EMPLOYEE_RESPONSES: dict = {
    status.HTTP_409_CONFLICT: {
        "model": ErrorEnvelope,
        "description": "The membership already has an employee profile.",
    },
    **_STRUCTURE_READ,
}

CREATE_ORG_LOCATION_SUMMARY = "Create location"
CREATE_ORG_LOCATION_DESCRIPTION = (
    "Creates a location (branch, office, warehouse) for the organization." + _STRUCTURE_WRITE_DESC
)
CREATE_ORG_LOCATION_RESPONSES: dict = {**_STRUCTURE_READ}

DELETE_ORG_CONTACT_SUMMARY = "Delete contact"
DELETE_ORG_CONTACT_DESCRIPTION = "Soft-deletes a contact." + _CONTACT_WRITE_DESC
DELETE_ORG_CONTACT_RESPONSES: dict = {**_STRUCTURE_READ}

DELETE_ORG_DEPARTMENT_SUMMARY = "Delete department"
DELETE_ORG_DEPARTMENT_DESCRIPTION = "Soft-deletes a department." + _STRUCTURE_WRITE_DESC
DELETE_ORG_DEPARTMENT_RESPONSES: dict = {**_STRUCTURE_READ}

DELETE_ORG_EMPLOYEE_SUMMARY = "Delete employee profile"
DELETE_ORG_EMPLOYEE_DESCRIPTION = "Soft-deletes an employee profile." + _STRUCTURE_WRITE_DESC
DELETE_ORG_EMPLOYEE_RESPONSES: dict = {**_STRUCTURE_READ}

DELETE_ORG_LOCATION_SUMMARY = "Delete location"
DELETE_ORG_LOCATION_DESCRIPTION = "Soft-deletes a location." + _STRUCTURE_WRITE_DESC
DELETE_ORG_LOCATION_RESPONSES: dict = {**_STRUCTURE_READ}

LIST_ORG_CONTACTS_SUMMARY = "List contacts"
LIST_ORG_CONTACTS_DESCRIPTION = (
    "Returns the organization's contacts. The caller must be an active member of the organization."
)
LIST_ORG_CONTACTS_RESPONSES: dict = {**_MEMBER_SESSION}

LIST_ORG_DEPARTMENTS_SUMMARY = "List departments"
LIST_ORG_DEPARTMENTS_DESCRIPTION = (
    "Returns the organization's departments. The caller must be an active member of the organization."
)
LIST_ORG_DEPARTMENTS_RESPONSES: dict = {**_MEMBER_SESSION}

LIST_ORG_EMPLOYEES_SUMMARY = "List employee profiles"
LIST_ORG_EMPLOYEES_DESCRIPTION = (
    "Returns the organization's employee profiles. The caller must be an active member of the organization."
)
LIST_ORG_EMPLOYEES_RESPONSES: dict = {**_MEMBER_SESSION}

LIST_ORG_LOCATIONS_SUMMARY = "List locations"
LIST_ORG_LOCATIONS_DESCRIPTION = (
    "Returns the organization's locations. The caller must be an active member of the organization."
)
LIST_ORG_LOCATIONS_RESPONSES: dict = {**_MEMBER_SESSION}

RETRIEVE_ORG_CONTACT_SUMMARY = "Retrieve contact"
RETRIEVE_ORG_CONTACT_DESCRIPTION = "Returns a single contact by ID."
RETRIEVE_ORG_CONTACT_RESPONSES: dict = {**_STRUCTURE_READ}

RETRIEVE_ORG_DEPARTMENT_SUMMARY = "Retrieve department"
RETRIEVE_ORG_DEPARTMENT_DESCRIPTION = "Returns a single department by ID."
RETRIEVE_ORG_DEPARTMENT_RESPONSES: dict = {**_STRUCTURE_READ}

RETRIEVE_ORG_EMPLOYEE_SUMMARY = "Retrieve employee profile"
RETRIEVE_ORG_EMPLOYEE_DESCRIPTION = "Returns a single employee profile by ID."
RETRIEVE_ORG_EMPLOYEE_RESPONSES: dict = {**_STRUCTURE_READ}

RETRIEVE_ORG_LOCATION_SUMMARY = "Retrieve location"
RETRIEVE_ORG_LOCATION_DESCRIPTION = "Returns a single location by ID."
RETRIEVE_ORG_LOCATION_RESPONSES: dict = {**_STRUCTURE_READ}

UPDATE_ORG_CONTACT_SUMMARY = "Update contact"
UPDATE_ORG_CONTACT_DESCRIPTION = "Updates a contact." + _CONTACT_WRITE_DESC
UPDATE_ORG_CONTACT_RESPONSES: dict = {**_STRUCTURE_READ}

UPDATE_ORG_DEPARTMENT_SUMMARY = "Update department"
UPDATE_ORG_DEPARTMENT_DESCRIPTION = "Updates a department." + _STRUCTURE_WRITE_DESC
UPDATE_ORG_DEPARTMENT_RESPONSES: dict = {**_STRUCTURE_READ}

UPDATE_ORG_EMPLOYEE_SUMMARY = "Update employee profile"
UPDATE_ORG_EMPLOYEE_DESCRIPTION = "Updates an employee profile." + _STRUCTURE_WRITE_DESC
UPDATE_ORG_EMPLOYEE_RESPONSES: dict = {**_STRUCTURE_READ}

UPDATE_ORG_LOCATION_SUMMARY = "Update location"
UPDATE_ORG_LOCATION_DESCRIPTION = "Updates a location." + _STRUCTURE_WRITE_DESC
UPDATE_ORG_LOCATION_RESPONSES: dict = {**_STRUCTURE_READ}

RETRIEVE_MY_ORG_DETAILS_SUMMARY = "Get my organization's details"
RETRIEVE_MY_ORG_DETAILS_DESCRIPTION = (
    "Returns the caller's organization record. The caller must be an active member of the "
    "organization. **Session tier** — backs the Enterprise app's organization pages."
)
RETRIEVE_MY_ORG_DETAILS_RESPONSES: dict = {**_MEMBER_SESSION}

UPDATE_MY_ORG_DETAILS_SUMMARY = "Update my organization's details"
UPDATE_MY_ORG_DETAILS_DESCRIPTION = (
    "Updates the caller's organization profile (business identity, contact, address, locale). "
    "Platform-controlled fields (slug, status) are not updatable here." + _STRUCTURE_WRITE_DESC
)
UPDATE_MY_ORG_DETAILS_RESPONSES: dict = {**_STRUCTURE_READ}


# ── Org access: roles, members, app assignments (session tier) ───────────────

PERMISSION_CATALOG_SUMMARY = "Get org permission catalog"
PERMISSION_CATALOG_DESCRIPTION = (
    "Returns the grouped catalog of org-level permission strings used to build "
    "and edit organization roles. Static; identical for every organization."
)
PERMISSION_CATALOG_RESPONSES: dict = {}

LIST_ORG_ROLES_SUMMARY = "List organization roles"
LIST_ORG_ROLES_DESCRIPTION = (
    "Returns the organization's roles — the default system roles seeded at creation "
    "plus any custom roles. Requires an active membership. **Session tier**."
)
LIST_ORG_ROLES_RESPONSES: dict = {**_MEMBER_SESSION}

CREATE_ORG_ROLE_SUMMARY = "Create organization role"
CREATE_ORG_ROLE_DESCRIPTION = (
    "Creates a custom role from catalog permissions. Requires the `roles:manage` "
    "permission. Role names must be unique within the organization. **Session tier**."
)
CREATE_ORG_ROLE_RESPONSES: dict = {
    status.HTTP_400_BAD_REQUEST: {"model": ErrorEnvelope, "description": "Unknown permission or invalid name."},
    status.HTTP_409_CONFLICT: {"model": ErrorEnvelope, "description": "Role name already exists."},
    **_MEMBER_SESSION,
}

RETRIEVE_ORG_ROLE_SUMMARY = "Get organization role"
RETRIEVE_ORG_ROLE_DESCRIPTION = "Returns one organization role. Requires an active membership. **Session tier**."
RETRIEVE_ORG_ROLE_RESPONSES: dict = {
    status.HTTP_404_NOT_FOUND: {"model": ErrorEnvelope, "description": "No role with this ID in the organization."},
    **_MEMBER_SESSION,
}

UPDATE_ORG_ROLE_SUMMARY = "Update organization role"
UPDATE_ORG_ROLE_DESCRIPTION = (
    "Updates a custom role's display name, description, or permission set. System roles are "
    "immutable. Requires `roles:manage`. **Session tier**."
)
UPDATE_ORG_ROLE_RESPONSES: dict = {
    status.HTTP_400_BAD_REQUEST: {"model": ErrorEnvelope, "description": "System role or unknown permission."},
    status.HTTP_404_NOT_FOUND: {"model": ErrorEnvelope, "description": "No role with this ID in the organization."},
    **_MEMBER_SESSION,
}

DELETE_ORG_ROLE_SUMMARY = "Delete organization role"
DELETE_ORG_ROLE_DESCRIPTION = (
    "Deletes a custom role. System roles and roles still linked to memberships cannot be "
    "deleted. Requires `roles:manage`. **Session tier**."
)
DELETE_ORG_ROLE_RESPONSES: dict = {
    status.HTTP_400_BAD_REQUEST: {"model": ErrorEnvelope, "description": "System role."},
    status.HTTP_404_NOT_FOUND: {"model": ErrorEnvelope, "description": "No role with this ID in the organization."},
    status.HTTP_409_CONFLICT: {"model": ErrorEnvelope, "description": "Role is still assigned to members."},
    **_MEMBER_SESSION,
}

LIST_ORG_MEMBERS_SUMMARY = "List organization members"
LIST_ORG_MEMBERS_DESCRIPTION = (
    "Returns the organization's members with basic user details and role. "
    "Requires the `members:read` permission. **Session tier**."
)
LIST_ORG_MEMBERS_RESPONSES: dict = {**_MEMBER_SESSION}

RETRIEVE_ORG_MEMBER_ME_SUMMARY = "Get my membership"
RETRIEVE_ORG_MEMBER_ME_DESCRIPTION = (
    "Returns the caller's own membership, role, and effective permission set for the "
    "organization. Requires an active membership. **Session tier**."
)
RETRIEVE_ORG_MEMBER_ME_RESPONSES: dict = {**_MEMBER_SESSION}

UPDATE_ORG_MEMBER_ROLE_SUMMARY = "Change a member's role"
UPDATE_ORG_MEMBER_ROLE_DESCRIPTION = (
    "Assigns an org role (system or custom) to a member. Requires `members:manage`. "
    "Only an owner may grant or remove the owner role, and the last active owner "
    "cannot be demoted. **Session tier**."
)
UPDATE_ORG_MEMBER_ROLE_RESPONSES: dict = {
    status.HTTP_400_BAD_REQUEST: {"model": ErrorEnvelope, "description": "Unknown role or last-owner demotion."},
    status.HTTP_404_NOT_FOUND: {"model": ErrorEnvelope, "description": "No membership with this ID in the organization."},
    **_MEMBER_SESSION,
}

LIST_APP_ASSIGNMENTS_SUMMARY = "List app assignments"
LIST_APP_ASSIGNMENTS_DESCRIPTION = (
    "Returns per-member app assignments for the organization, optionally filtered by "
    "member or app. Requires the `apps:read` permission. **Session tier**."
)
LIST_APP_ASSIGNMENTS_RESPONSES: dict = {**_MEMBER_SESSION}

CREATE_APP_ASSIGNMENT_SUMMARY = "Assign a member to an app"
CREATE_APP_ASSIGNMENT_DESCRIPTION = (
    "Grants a member access to a platform app the organization is provisioned for "
    "(re-activates a revoked assignment). Requires `apps:assign`. **Session tier**."
)
CREATE_APP_ASSIGNMENT_RESPONSES: dict = {
    status.HTTP_404_NOT_FOUND: {"model": ErrorEnvelope, "description": "App or member not found."},
    status.HTTP_409_CONFLICT: {
        "model": ErrorEnvelope,
        "description": "Organization is not provisioned for this app.",
    },
    **_MEMBER_SESSION,
}

REVOKE_APP_ASSIGNMENT_SUMMARY = "Revoke an app assignment"
REVOKE_APP_ASSIGNMENT_DESCRIPTION = (
    "Revokes a member's access to an app (keeps the record with `status = 'revoked'`). "
    "Requires `apps:assign`. **Session tier**."
)
REVOKE_APP_ASSIGNMENT_RESPONSES: dict = {
    status.HTTP_404_NOT_FOUND: {"model": ErrorEnvelope, "description": "No assignment with this ID in the organization."},
    **_MEMBER_SESSION,
}
