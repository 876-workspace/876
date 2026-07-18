from typing import Any

CREATE_AUDIT_EVENT_SUMMARY = "Create audit event"
CREATE_AUDIT_EVENT_DESCRIPTION = (
    "Records a sanitized first-party analytics or client telemetry event."
)
CREATE_AUDIT_EVENT_RESPONSES: dict[int | str, dict[str, Any]] = {
    201: {"description": "Audit event recorded."},
    400: {"description": "Invalid event payload."},
    401: {"description": "Missing or invalid API key."},
}

LIST_AUDIT_EVENTS_SUMMARY = "List audit events"
LIST_AUDIT_EVENTS_DESCRIPTION = (
    "Returns queryable audit and analytics events for Console."
)
LIST_AUDIT_EVENTS_RESPONSES: dict[int | str, dict[str, Any]] = {
    200: {"description": "Audit events returned."},
    401: {"description": "Missing API key or internal key."},
    403: {"description": "The caller is not authorized to view audit events."},
}
