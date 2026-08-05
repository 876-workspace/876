from typing import Any

LIST_AUTH_ATTEMPTS_SUMMARY = "List authentication attempts"
LIST_AUTH_ATTEMPTS_DESCRIPTION = "Lists authentication attempts newest first."
LIST_AUTH_ATTEMPTS_RESPONSES: dict[int | str, dict[str, Any]] = {}
RETRIEVE_AUTH_ATTEMPT_SUMMARY = "Retrieve an authentication attempt"
RETRIEVE_AUTH_ATTEMPT_DESCRIPTION = "Retrieves one authentication attempt."
RETRIEVE_AUTH_ATTEMPT_RESPONSES: dict[int | str, dict[str, Any]] = {}
RETRIEVE_AUTH_ATTEMPT_SUMMARY_SUMMARY = "Summarize authentication attempts"
RETRIEVE_AUTH_ATTEMPT_SUMMARY_DESCRIPTION = "Returns SQL aggregates for a bounded dashboard window."
RETRIEVE_AUTH_ATTEMPT_SUMMARY_RESPONSES: dict[int | str, dict[str, Any]] = {}
