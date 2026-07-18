"""Organization-level permission catalog and default role definitions.

Single source of truth for the org roles/permissions framework used by the
Enterprise app (and any product app that consults org membership permissions).

Terminology (industry-standard, SCIM/Entra/Zoho conventions):

- An organization is **provisioned** onto a platform app (``subscriptions``
  table — org→app entitlement).
- A member is **assigned** to a provisioned app (``app_assignments`` table —
  user→app grant inside the org).

Permissions are ``resource:action`` strings scoped to a single organization.
They govern what a member can do *inside the Enterprise workspace* (the org
directory app). Product apps (Couriers, ...) own their own in-app permission
models; the platform only answers "is this member assigned to this app".

Default roles are seeded per organization at creation (``is_system=true``,
immutable through the API). Organizations may add custom roles
(``is_system=false``) built from this catalog.
"""

from __future__ import annotations

from dataclasses import dataclass

# ---------------------------------------------------------------------------
# Permission catalog
# ---------------------------------------------------------------------------

ORG_PERMISSION_GROUPS: dict[str, list[str]] = {
    "Organization": [
        "org:read",
        "org:update",
        "org:delete",
    ],
    "Billing": [
        "billing:read",
        "billing:manage",
    ],
    "Members": [
        "members:read",
        "members:invite",
        "members:manage",
    ],
    "Roles": [
        "roles:read",
        "roles:manage",
    ],
    "Apps": [
        "apps:read",
        "apps:provision",
        "apps:assign",
    ],
    "Structure": [
        "structure:read",
        "structure:manage",
    ],
}

ALL_ORG_PERMISSIONS: frozenset[str] = frozenset(
    permission for group in ORG_PERMISSION_GROUPS.values() for permission in group
)


def is_valid_org_permission(permission: str) -> bool:
    return permission in ALL_ORG_PERMISSIONS


# ---------------------------------------------------------------------------
# Default role definitions (seeded per org, is_system=true)
# ---------------------------------------------------------------------------

_READ_ONLY_MEMBER = [
    "org:read",
    "members:read",
    "structure:read",
]

_ADMIN = sorted(
    ALL_ORG_PERMISSIONS
    - {
        # Billing visibility/management and org deletion stay owner/billing-manager
        # territory (Zoho One model: Admin manages users and apps, not billing).
        "billing:read",
        "billing:manage",
        "org:delete",
    }
)

_BILLING_MANAGER = [
    "org:read",
    "billing:read",
    "billing:manage",
    "members:read",
]


@dataclass(frozen=True)
class OrgRoleDefinition:
    name: str
    display_name: str
    description: str
    permissions: list[str]


DEFAULT_ORG_ROLES: list[OrgRoleDefinition] = [
    OrgRoleDefinition(
        name="owner",
        display_name="Owner",
        description="Full control of the organization, including billing and deletion.",
        permissions=sorted(ALL_ORG_PERMISSIONS),
    ),
    OrgRoleDefinition(
        name="admin",
        display_name="Admin",
        description="Manages members, roles, apps, and organization details. No billing access.",
        permissions=_ADMIN,
    ),
    OrgRoleDefinition(
        name="billing_manager",
        display_name="Billing Manager",
        description="Views and manages billing, payment details, and subscriptions.",
        permissions=list(_BILLING_MANAGER),
    ),
    OrgRoleDefinition(
        name="member",
        display_name="Member",
        description="Default role. Views the organization directory.",
        permissions=list(_READ_ONLY_MEMBER),
    ),
]

DEFAULT_ORG_ROLES_BY_NAME: dict[str, OrgRoleDefinition] = {
    role.name: role for role in DEFAULT_ORG_ROLES
}

# The role auto-assigned to new memberships when none is specified
# (WorkOS-style default member role).
DEFAULT_MEMBER_ROLE_NAME = "member"

# The role granted to the organization creator. "Owner" is an org-lifecycle
# role (the account that created/controls the org), not a job title.
OWNER_ROLE_NAME = "owner"


def default_permissions_for_role_name(role_name: str) -> list[str]:
    """Fallback permission resolution for legacy memberships without role_id.

    Unknown role names resolve to the default member permissions.
    """
    definition = DEFAULT_ORG_ROLES_BY_NAME.get(role_name)
    if definition is None:
        definition = DEFAULT_ORG_ROLES_BY_NAME[DEFAULT_MEMBER_ROLE_NAME]
    return list(definition.permissions)
