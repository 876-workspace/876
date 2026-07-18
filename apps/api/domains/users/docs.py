"""Rich Swagger descriptions and response maps for the Users domain."""

from __future__ import annotations

from fastapi import status

from core.responses import ErrorEnvelope

BACKFILL_USERNAMES_SUMMARY = "Backfill usernames from email prefix"
BACKFILL_USERNAMES_DESCRIPTION = "Assigns usernames to users that do not have one. **Admin only**."
BACKFILL_USERNAMES_RESPONSES: dict = {}

BAN_USER_SUMMARY = "Ban user"
BAN_USER_DESCRIPTION = (
    "Bans a user, blocking every authentication path (password, social, OTP, and "
    "token refresh) and revoking all of their active sessions immediately. "
    "Reversible via unban. **Admin only**."
)
BAN_USER_RESPONSES: dict = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "No user found with this ID.",
    },
}

CREATE_USER_SUMMARY = "Create user"
CREATE_USER_DESCRIPTION = "Creates a user. **Admin only**."
CREATE_USER_RESPONSES: dict = {
    status.HTTP_409_CONFLICT: {
        "model": ErrorEnvelope,
        "description": "Email or provider identity already exists.",
    },
}

CREATE_MY_ADDRESS_SUMMARY = "Create my address"
CREATE_MY_ADDRESS_DESCRIPTION = "Creates an address for the current consumer user."
CREATE_MY_ADDRESS_RESPONSES: dict = {}

CREATE_MY_CONTACT_SUMMARY = "Create my contact"
CREATE_MY_CONTACT_DESCRIPTION = "Saves another consumer user as a one-way contact for the current user."
CREATE_MY_CONTACT_RESPONSES: dict = {
    status.HTTP_400_BAD_REQUEST: {
        "model": ErrorEnvelope,
        "description": "The contact is invalid or already exists.",
    },
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "The target user does not exist.",
    },
}

DELETE_USER_SUMMARY = "Delete user"
DELETE_USER_DESCRIPTION = "Deletes a user. Returns a deletion tombstone. **Admin only**."
DELETE_USER_RESPONSES: dict = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "No user found with this ID.",
    },
}

DELETE_MY_ADDRESS_SUMMARY = "Delete my address"
DELETE_MY_ADDRESS_DESCRIPTION = "Deletes an address owned by the current consumer user."
DELETE_MY_ADDRESS_RESPONSES: dict = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "Address not found.",
    },
}

DELETE_MY_CONTACT_SUMMARY = "Delete my contact"
DELETE_MY_CONTACT_DESCRIPTION = "Deletes a saved contact owned by the current consumer user."
DELETE_MY_CONTACT_RESPONSES: dict = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "Contact not found.",
    },
}

DISABLE_USER_FEATURE_SUMMARY = "Disable user feature"
DISABLE_USER_FEATURE_DESCRIPTION = """
Disables a feature flag for a specific user.

Marks the local entitlement grant as `disabled`.

**Admin only**.
"""
DISABLE_USER_FEATURE_RESPONSES: dict = {
    status.HTTP_401_UNAUTHORIZED: {
        "model": ErrorEnvelope,
        "description": "Missing or invalid internal key.",
    },
    status.HTTP_403_FORBIDDEN: {
        "model": ErrorEnvelope,
        "description": "Caller is not an admin.",
    },
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "User or feature not found.",
    },
}

ENSURE_USER_SUMMARY = "Ensure user exists"
ENSURE_USER_DESCRIPTION = """
Idempotently creates or returns a user by WorkOS ID.

Called by the consumer app's auth middleware after WorkOS authentication to
ensure a local user record exists. Creates the user with a default `consumer`
account type and `active` status if not found.
"""
ENSURE_USER_RESPONSES: dict = {
    status.HTTP_400_BAD_REQUEST: {
        "model": ErrorEnvelope,
        "description": "Missing required fields.",
    },
}

GET_BY_USERNAME_SUMMARY = "Retrieve user by username"
GET_BY_USERNAME_DESCRIPTION = "Returns a single user by username. **Admin only**."
GET_BY_USERNAME_RESPONSES: dict = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "No user found with this username.",
    },
}

GET_BY_WORKOS_ID_SUMMARY = "Retrieve user by WorkOS ID"
GET_BY_WORKOS_ID_DESCRIPTION = """
Looks up a local user record by WorkOS user ID.

Used by the consumer app's auth callback to resolve the local user after
WorkOS authentication. No bearer token is required (server-to-server).
"""
GET_BY_WORKOS_ID_RESPONSES: dict = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "No user found with this WorkOS ID.",
    },
}

GRANT_USER_FEATURE_SUMMARY = "Grant user feature"
GRANT_USER_FEATURE_DESCRIPTION = """
Grants a feature flag to a specific user.

* Validates that the feature scope is compatible with the user's account type.
* Upserts the local `user_features` record.

**Admin only**.
"""
GRANT_USER_FEATURE_RESPONSES: dict = {
    status.HTTP_400_BAD_REQUEST: {
        "model": ErrorEnvelope,
        "description": "Feature scope is incompatible with the user's account type.",
    },
    status.HTTP_401_UNAUTHORIZED: {
        "model": ErrorEnvelope,
        "description": "Missing or invalid internal key.",
    },
    status.HTTP_403_FORBIDDEN: {
        "model": ErrorEnvelope,
        "description": "Caller is not an admin.",
    },
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "User or feature not found.",
    },
}

LIST_OAUTH_GRANTS_SUMMARY = "List user OAuth grants"
LIST_OAUTH_GRANTS_DESCRIPTION = """
Returns all active OAuth grants for a user — the third-party apps the user
has authorized via the consent flow.
"""
LIST_OAUTH_GRANTS_RESPONSES: dict = {
    status.HTTP_400_BAD_REQUEST: {
        "model": ErrorEnvelope,
        "description": "`userId` path parameter is required.",
    },
}

LIST_USER_ACCOUNTS_SUMMARY = "List user auth accounts"
LIST_USER_ACCOUNTS_DESCRIPTION = """
Returns the linked sign-in provider accounts for a user. **Admin only**.
"""
LIST_USER_ACCOUNTS_RESPONSES: dict = {
    status.HTTP_401_UNAUTHORIZED: {
        "model": ErrorEnvelope,
        "description": "Missing or invalid internal key.",
    },
    status.HTTP_403_FORBIDDEN: {
        "model": ErrorEnvelope,
        "description": "Caller is not an admin.",
    },
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "User not found.",
    },
}

LIST_USER_FEATURES_SUMMARY = "List user feature grants"
LIST_USER_FEATURES_DESCRIPTION = """
Returns all feature grants for a user. **Admin only**.
"""
LIST_USER_FEATURES_RESPONSES: dict = {
    status.HTTP_401_UNAUTHORIZED: {
        "model": ErrorEnvelope,
        "description": "Missing or invalid internal key.",
    },
    status.HTTP_403_FORBIDDEN: {
        "model": ErrorEnvelope,
        "description": "Caller is not an admin.",
    },
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "User not found.",
    },
}

LIST_USER_APPS_SUMMARY = "List apps for user"
LIST_USER_APPS_DESCRIPTION = """
Returns all apps the user has authenticated through (by session enrollment).
Ordered by first enrollment date ascending. **Admin only**.
"""
LIST_USER_APPS_RESPONSES: dict = {
    status.HTTP_401_UNAUTHORIZED: {
        "model": ErrorEnvelope,
        "description": "Missing or invalid internal key.",
    },
    status.HTTP_403_FORBIDDEN: {
        "model": ErrorEnvelope,
        "description": "Caller is not an admin.",
    },
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "User not found.",
    },
}

LIST_USERS_SUMMARY = "List users"
LIST_USERS_DESCRIPTION = """
Returns a paginated list of all users. **Admin only** (requires `X-Internal-Key`).
"""
LIST_USERS_RESPONSES: dict = {
    status.HTTP_401_UNAUTHORIZED: {
        "model": ErrorEnvelope,
        "description": "Missing or invalid internal key.",
    },
    status.HTTP_403_FORBIDDEN: {
        "model": ErrorEnvelope,
        "description": "Caller is not an admin.",
    },
}

LIST_MY_ADDRESSES_SUMMARY = "List my addresses"
LIST_MY_ADDRESSES_DESCRIPTION = "Returns addresses owned by the current consumer user."
LIST_MY_ADDRESSES_RESPONSES: dict = {}

LIST_MY_CONTACTS_SUMMARY = "List my contacts"
LIST_MY_CONTACTS_DESCRIPTION = "Returns one-way contacts saved by the current consumer user."
LIST_MY_CONTACTS_RESPONSES: dict = {}

LIST_MY_MEMBERSHIPS_SUMMARY = "List my memberships"
LIST_MY_MEMBERSHIPS_DESCRIPTION = (
    "Returns the current user's organization memberships with each org's id, name, slug, and status. "
    "Session tier — the self-scoped replacement for the admin routing-memberships lookup."
)
LIST_MY_MEMBERSHIPS_RESPONSES: dict = {}

RETRIEVE_MY_ADDRESS_SUMMARY = "Retrieve my address"
RETRIEVE_MY_ADDRESS_DESCRIPTION = "Returns one address owned by the current consumer user."
RETRIEVE_MY_ADDRESS_RESPONSES: dict = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "Address not found.",
    },
}

RETRIEVE_MY_CONTACT_SUMMARY = "Retrieve my contact"
RETRIEVE_MY_CONTACT_DESCRIPTION = "Returns one saved contact owned by the current consumer user."
RETRIEVE_MY_CONTACT_RESPONSES: dict = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "Contact not found.",
    },
}

RETRIEVE_MY_PROFILE_SUMMARY = "Retrieve my profile"
RETRIEVE_MY_PROFILE_DESCRIPTION = "Returns the current consumer user's personal profile."
RETRIEVE_MY_PROFILE_RESPONSES: dict = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "User not found.",
    },
}

RETRIEVE_USER_SUMMARY = "Retrieve user"
RETRIEVE_USER_DESCRIPTION = """
Returns a single user by ID. **Admin only** (requires `X-Internal-Key`).
"""
RETRIEVE_USER_RESPONSES: dict = {
    status.HTTP_401_UNAUTHORIZED: {
        "model": ErrorEnvelope,
        "description": "Missing or invalid internal key.",
    },
    status.HTTP_403_FORBIDDEN: {
        "model": ErrorEnvelope,
        "description": "Caller is not an admin.",
    },
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "No user found with this ID.",
    },
}

REVOKE_OAUTH_GRANT_SUMMARY = "Revoke user OAuth grant"
REVOKE_OAUTH_GRANT_DESCRIPTION = """
Revokes a specific OAuth grant, preventing the app from obtaining new tokens
for this user until they re-authorize.
"""

SEARCH_USERS_SUMMARY = "Search users"
SEARCH_USERS_DESCRIPTION = "Searches users by email, username, or name. **Admin only**."
SEARCH_USERS_RESPONSES: dict = {}

UNBAN_USER_SUMMARY = "Unban user"
UNBAN_USER_DESCRIPTION = (
    "Lifts a user's ban, restoring their ability to sign in, and clears the "
    "stored ban reason. **Admin only**."
)
UNBAN_USER_RESPONSES: dict = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "No user found with this ID.",
    },
}

USERNAME_AVAILABILITY_SUMMARY = "Check username availability"
USERNAME_AVAILABILITY_DESCRIPTION = (
    "Checks whether a username can be claimed. Runs three gates — format, the "
    "reserved list, and whether another user already holds it (including "
    "soft-deleted users). Pass `exclude_user_id` to ignore the user currently "
    "holding the name (e.g. when editing their own profile). **Admin only**."
)
USERNAME_AVAILABILITY_RESPONSES: dict = {}

UPDATE_USER_SUMMARY = "Update user"
UPDATE_USER_DESCRIPTION = "Updates a user's editable profile and platform fields. **Admin only**."
UPDATE_USER_RESPONSES: dict = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "No user found with this ID.",
    },
}

UPDATE_MY_ADDRESS_SUMMARY = "Update my address"
UPDATE_MY_ADDRESS_DESCRIPTION = "Updates an address owned by the current consumer user."
UPDATE_MY_ADDRESS_RESPONSES: dict = {
    status.HTTP_400_BAD_REQUEST: {
        "model": ErrorEnvelope,
        "description": "No fields were provided.",
    },
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "Address not found.",
    },
}

UPDATE_MY_CONTACT_SUMMARY = "Update my contact"
UPDATE_MY_CONTACT_DESCRIPTION = "Updates a saved contact owned by the current consumer user."
UPDATE_MY_CONTACT_RESPONSES: dict = {
    status.HTTP_400_BAD_REQUEST: {
        "model": ErrorEnvelope,
        "description": "No fields were provided.",
    },
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "Contact not found.",
    },
}

UPDATE_MY_PROFILE_SUMMARY = "Update my profile"
UPDATE_MY_PROFILE_DESCRIPTION = "Updates personal profile fields for the current consumer user."
UPDATE_MY_PROFILE_RESPONSES: dict = {}

# ---------------------------------------------------------------------------
# Reserved usernames
# ---------------------------------------------------------------------------

LIST_RESERVED_USERNAMES_SUMMARY = "List reserved usernames"
LIST_RESERVED_USERNAMES_DESCRIPTION = (
    "Returns all reserved usernames. These usernames cannot be claimed by any user. **Admin only**."
)
LIST_RESERVED_USERNAMES_RESPONSES: dict = {}

CREATE_RESERVED_USERNAME_SUMMARY = "Reserve a username"
CREATE_RESERVED_USERNAME_DESCRIPTION = (
    "Adds a username to the reserved list, preventing any user from claiming it. "
    "The username must pass the standard format rules. **Admin only**."
)
CREATE_RESERVED_USERNAME_RESPONSES: dict = {
    status.HTTP_409_CONFLICT: {
        "model": ErrorEnvelope,
        "description": "This username is already on the reserved list.",
    },
    status.HTTP_400_BAD_REQUEST: {
        "model": ErrorEnvelope,
        "description": "The username does not pass format validation.",
    },
}

DELETE_RESERVED_USERNAME_SUMMARY = "Remove a reserved username"
DELETE_RESERVED_USERNAME_DESCRIPTION = (
    "Removes a username from the reserved list, allowing it to be claimed. **Admin only**."
)
DELETE_RESERVED_USERNAME_RESPONSES: dict = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "No reserved username found with this value.",
    },
}

# ---------------------------------------------------------------------------
# Account (linked sign-in provider) admin operations
# ---------------------------------------------------------------------------

UNLINK_USER_ACCOUNT_SUMMARY = "Unlink auth account"
UNLINK_USER_ACCOUNT_DESCRIPTION = (
    "Removes a linked sign-in provider account from a user. The user will no longer be able "
    "to sign in through that provider. **Admin only**."
)
UNLINK_USER_ACCOUNT_RESPONSES: dict = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "User or account not found.",
    },
}

# ---------------------------------------------------------------------------
# Session revocation
# ---------------------------------------------------------------------------

REVOKE_USER_SESSIONS_SUMMARY = "Revoke all user sessions"
REVOKE_USER_SESSIONS_DESCRIPTION = (
    "Immediately invalidates every active session for a user, forcing them to sign in again "
    "on all devices. Does not ban the user. **Admin only**."
)
REVOKE_USER_SESSIONS_RESPONSES: dict = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorEnvelope,
        "description": "No user found with this ID.",
    },
}
