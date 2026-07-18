"""Rich Swagger descriptions and response maps for the Memberships domain."""

from __future__ import annotations

from fastapi import status

from core.responses import ErrorEnvelope

_ADMIN: dict = {
    status.HTTP_401_UNAUTHORIZED: {
        "model": ErrorEnvelope,
        "description": "Missing or invalid internal key.",
    },
    status.HTTP_403_FORBIDDEN: {
        "model": ErrorEnvelope,
        "description": "Caller is not an admin.",
    },
}

CREATE_MEMBERSHIP_SUMMARY = "Create membership"
CREATE_MEMBERSHIP_DESCRIPTION = """
Creates a membership linking a user to an organization. The user must have
`account_type: enterprise` and must not already be a member of the organization.
**Admin only**.
"""
CREATE_MEMBERSHIP_RESPONSES: dict = {
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
    **_ADMIN,
}

DELETE_MEMBERSHIP_SUMMARY = "Delete membership"
DELETE_MEMBERSHIP_DESCRIPTION = "Deletes a membership. Returns a deletion tombstone. **Admin only**."
DELETE_MEMBERSHIP_RESPONSES: dict = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "Membership not found.",
    },
    **_ADMIN,
}

LIST_MEMBERSHIPS_SUMMARY = "List memberships"
LIST_MEMBERSHIPS_DESCRIPTION = """
Returns a paginated list of memberships. **Admin only**.

Supports optional `organization_id` and `user_id` filters.
"""
LIST_MEMBERSHIPS_RESPONSES: dict = {**_ADMIN}

RETRIEVE_MEMBERSHIP_SUMMARY = "Retrieve membership"
RETRIEVE_MEMBERSHIP_DESCRIPTION = "Returns a single membership by ID. **Admin only**."
RETRIEVE_MEMBERSHIP_RESPONSES: dict = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "Membership not found.",
    },
    **_ADMIN,
}

UPDATE_MEMBERSHIP_SUMMARY = "Update membership"
UPDATE_MEMBERSHIP_DESCRIPTION = "Updates a membership's role, status, or WorkOS membership ID. **Admin only**."
UPDATE_MEMBERSHIP_RESPONSES: dict = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "Membership not found.",
    },
    status.HTTP_409_CONFLICT: {
        "model": ErrorEnvelope,
        "description": "WorkOS membership ID is already in use.",
    },
    **_ADMIN,
}
