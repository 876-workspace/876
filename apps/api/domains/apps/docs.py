"""Swagger descriptions and response maps for the Apps domain."""

from __future__ import annotations

from fastapi import status

from core.responses import ErrorEnvelope

GET_APP_PUBLIC_SUMMARY = "Get public app info"
GET_APP_PUBLIC_DESCRIPTION = "Returns public-safe branding information (name, logo) for a registered app identified by client_id. Used by the login page to display app context."
GET_APP_PUBLIC_RESPONSES: dict = {
    200: {"description": "App public info returned."},
    404: {"description": "App not found."},
}

CREATE_API_KEY_SUMMARY = "Create an API key"
CREATE_API_KEY_DESCRIPTION = """
Creates a new API key for the app. The plaintext key is returned **once** — store it securely.
"""
CREATE_API_KEY_RESPONSES: dict = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "App not found.",
    },
}

CREATE_APP_SUMMARY = "Create an app"
CREATE_APP_DESCRIPTION = """
Registers a new application.

* For `confidential` clients: generates a `clientSecret` returned **once** in
  the response. Store it securely — it cannot be retrieved again.
* Validates each `redirect_uri` for safety.
* Defaults `scopes_allowed` to `["openid", "profile", "email"]` if omitted.
* Set `appKind` to `"internal"` for first-party 876 applications.

The `client_id` is auto-generated.
"""
CREATE_APP_RESPONSES: dict = {
    status.HTTP_400_BAD_REQUEST: {
        "model": ErrorEnvelope,
        "description": "Invalid scope or unsafe redirect URI.",
    },
}

DELETE_API_KEY_SUMMARY = "Delete an API key"
DELETE_API_KEY_DESCRIPTION = "Deletes an API key for an app. Returns a deletion tombstone. **Admin only**."
DELETE_API_KEY_RESPONSES: dict = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "API key not found.",
    },
}

DELETE_APP_SUMMARY = "Delete an app"
DELETE_APP_DESCRIPTION = "Deletes a registered app. Returns a deletion tombstone. **Admin only**."
DELETE_APP_RESPONSES: dict = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "App not found.",
    },
}

LIST_API_KEYS_SUMMARY = "List API keys for an app"
LIST_API_KEYS_DESCRIPTION = "Returns a paginated list of API keys for an app. **Admin only**."
LIST_API_KEYS_RESPONSES: dict = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "App not found.",
    },
}

LIST_APP_FEATURES_SUMMARY = "List features for an app"
LIST_APP_FEATURES_DESCRIPTION = "Returns a paginated list of feature flags assigned to this app. **Admin only**."
LIST_APP_FEATURES_RESPONSES: dict = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "App not found.",
    },
}

LIST_APP_SUBSCRIPTIONS_SUMMARY = "List subscriptions for an app"
LIST_APP_SUBSCRIPTIONS_DESCRIPTION = (
    "Returns every organization's access/subscription record for this app, newest first. **Admin only**."
)
LIST_APP_SUBSCRIPTIONS_RESPONSES: dict = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "App not found.",
    },
}

LIST_APPS_SUMMARY = "List apps"
LIST_APPS_DESCRIPTION = """
Returns a paginated list of apps. Filter by `organizationId`,
or `status`.
"""
LIST_APPS_RESPONSES: dict = {
    status.HTTP_400_BAD_REQUEST: {
        "model": ErrorEnvelope,
        "description": "`organizationId` query parameter is required.",
    },
}

RETRIEVE_CURRENT_APP_SUMMARY = "Retrieve current app"
RETRIEVE_CURRENT_APP_DESCRIPTION = """
Returns the registered app associated with the API key used on the request.

This is useful for first-party server flows that already hold their app API key
and need the app's OAuth metadata, such as `client_id`, without copying another
environment variable.
"""
RETRIEVE_CURRENT_APP_RESPONSES: dict = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "App not found.",
    },
}

RETRIEVE_APP_SUMMARY = "Retrieve an app"
RETRIEVE_APP_DESCRIPTION = "Returns a single registered app by ID."
RETRIEVE_APP_RESPONSES: dict = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "App not found.",
    },
}

UPDATE_API_KEY_SUMMARY = "Update an API key"
UPDATE_API_KEY_DESCRIPTION = "Updates mutable fields (name) for an API key. **Admin only**."
UPDATE_API_KEY_RESPONSES: dict = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "API key not found.",
    },
}

REVOKE_API_KEY_SUMMARY = "Revoke an API key"
REVOKE_API_KEY_DESCRIPTION = "Revokes an API key for an app. **Admin only**."
REVOKE_API_KEY_RESPONSES: dict = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "API key not found.",
    },
}

UPDATE_APP_SUMMARY = "Update an app"
UPDATE_APP_DESCRIPTION = "Updates a registered app. **Admin only**."
UPDATE_APP_RESPONSES: dict = {
    status.HTTP_400_BAD_REQUEST: {
        "model": ErrorEnvelope,
        "description": "No fields to update.",
    },
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "App not found.",
    },
}
