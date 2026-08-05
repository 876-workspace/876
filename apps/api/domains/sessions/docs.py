from typing import Any

LIST_SESSIONS_SUMMARY = "List sessions"
LIST_SESSIONS_DESCRIPTION = "Lists platform sessions newest first."
LIST_SESSIONS_RESPONSES: dict[int | str, dict[str, Any]] = {}
RETRIEVE_SESSION_SUMMARY = "Retrieve a session"
RETRIEVE_SESSION_DESCRIPTION = "Retrieves one session without credential material."
RETRIEVE_SESSION_RESPONSES: dict[int | str, dict[str, Any]] = {}
REVOKE_SESSION_SUMMARY = "Revoke a session"
REVOKE_SESSION_DESCRIPTION = "Soft-revokes one session."
REVOKE_SESSION_RESPONSES: dict[int | str, dict[str, Any]] = {}
REVOKE_USER_SESSIONS_SUMMARY = "Revoke user sessions"
REVOKE_USER_SESSIONS_DESCRIPTION = "Soft-revokes every active session for a user."
REVOKE_USER_SESSIONS_RESPONSES: dict[int | str, dict[str, Any]] = {}
