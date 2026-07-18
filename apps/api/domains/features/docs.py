"""Rich Swagger descriptions and response maps for the Features domain."""

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

LIST_FEATURES_DESCRIPTION = """
Returns a paginated list of all feature flags. **Admin only**.

Feature flags are created and managed directly via the API; PostHog is the provider catalog.
"""
LIST_FEATURES_RESPONSES: dict = {**_ADMIN}

RETRIEVE_FEATURE_DESCRIPTION = "Returns a single feature flag by ID. **Admin only**."
RETRIEVE_FEATURE_RESPONSES: dict = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "Feature not found.",
    },
    **_ADMIN,
}

UPDATE_FEATURE_DESCRIPTION = """
Updates a feature flag. **Admin only**.

Editable fields: `description`, `enabled`, `scope`, `default_value`, `consumer_default_enabled`, `app_id`.
Changes to `enabled` and `description` are also pushed to PostHog.
"""
UPDATE_FEATURE_RESPONSES: dict = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "Feature not found.",
    },
    status.HTTP_409_CONFLICT: {
        "model": ErrorEnvelope,
        "description": "Feature is not mapped to PostHog.",
    },
    **_ADMIN,
}

CREATE_FEATURE_SUMMARY = "Create feature flag"
CREATE_FEATURE_DESCRIPTION = "Creates a new feature flag in PostHog and mirrors it locally. **Admin only**."
CREATE_FEATURE_RESPONSES: dict = {
    status.HTTP_201_CREATED: {
        "description": "Feature flag created successfully.",
    },
    status.HTTP_400_BAD_REQUEST: {
        "model": ErrorEnvelope,
        "description": "Invalid request body.",
    },
    status.HTTP_422_UNPROCESSABLE_CONTENT: {
        "model": ErrorEnvelope,
        "description": "Validation error.",
    },
    **_ADMIN,
}

DELETE_FEATURE_SUMMARY = "Delete feature flag"
DELETE_FEATURE_DESCRIPTION = "Deletes the feature flag from PostHog and removes the local mirror. **Admin only**."
DELETE_FEATURE_RESPONSES: dict = {
    status.HTTP_204_NO_CONTENT: {
        "description": "Feature flag deleted.",
    },
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "Feature not found.",
    },
    status.HTTP_409_CONFLICT: {
        "model": ErrorEnvelope,
        "description": "Feature is not mapped to PostHog.",
    },
    **_ADMIN,
}

EVALUATE_FEATURES_SUMMARY = "Evaluate feature flags"
EVALUATE_FEATURES_DESCRIPTION = (
    "Resolves enabled feature flags for a user, organization, app, or combined context. "
    "Returns 876-normalized feature records and uses local feature state as the durable fallback. **Admin only**."
)
EVALUATE_FEATURES_RESPONSES: dict = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "App, user, or organization not found.",
    },
    **_ADMIN,
}

GRANT_USER_FEATURE_SUMMARY = "Grant feature to user"
GRANT_USER_FEATURE_DESCRIPTION = (
    "Grants a feature flag override to a specific user in the local entitlement catalog. **Admin only**."
)
GRANT_USER_FEATURE_RESPONSES: dict = {
    status.HTTP_201_CREATED: {
        "description": "Feature grant created or updated.",
    },
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "User or feature not found.",
    },
    **_ADMIN,
}

UPDATE_USER_FEATURE_SUMMARY = "Update user feature grant"
UPDATE_USER_FEATURE_DESCRIPTION = "Updates an existing feature flag override for a specific user. **Admin only**."
UPDATE_USER_FEATURE_RESPONSES: dict = {
    status.HTTP_200_OK: {
        "description": "Feature grant updated.",
    },
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "Grant not found.",
    },
    **_ADMIN,
}

REVOKE_USER_FEATURE_SUMMARY = "Revoke feature from user"
REVOKE_USER_FEATURE_DESCRIPTION = (
    "Removes a feature flag override from a specific user. **Admin only**."
)
REVOKE_USER_FEATURE_RESPONSES: dict = {
    status.HTTP_200_OK: {
        "description": "Feature grant revoked.",
    },
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "Grant not found.",
    },
    **_ADMIN,
}

GRANT_ORG_FEATURE_SUMMARY = "Grant feature to organization"
GRANT_ORG_FEATURE_DESCRIPTION = (
    "Grants a feature flag override to a specific organization in the local entitlement catalog. **Admin only**."
)
GRANT_ORG_FEATURE_RESPONSES: dict = {
    status.HTTP_201_CREATED: {
        "description": "Organization feature grant created or updated.",
    },
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "Organization or feature not found.",
    },
    **_ADMIN,
}

LIST_ORG_FEATURES_SUMMARY = "List organization feature grants"
LIST_ORG_FEATURES_DESCRIPTION = "Returns all feature grants for an organization. **Admin only**."
LIST_ORG_FEATURES_RESPONSES: dict = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "Organization not found.",
    },
    **_ADMIN,
}

REVOKE_ORG_FEATURE_SUMMARY = "Revoke feature from organization"
REVOKE_ORG_FEATURE_DESCRIPTION = (
    "Removes a feature flag override from a specific organization. "
    "**Admin only**."
)
REVOKE_ORG_FEATURE_RESPONSES: dict = {
    status.HTTP_200_OK: {
        "description": "Organization feature grant revoked.",
    },
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "Grant not found.",
    },
    **_ADMIN,
}

UPDATE_ORG_FEATURE_SUMMARY = "Update organization feature grant"
UPDATE_ORG_FEATURE_DESCRIPTION = "Updates an existing feature flag override for a specific organization. **Admin only**."
UPDATE_ORG_FEATURE_RESPONSES: dict = {
    status.HTTP_200_OK: {
        "description": "Organization feature grant updated.",
    },
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "Grant not found.",
    },
    **_ADMIN,
}
