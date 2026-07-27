from typing import Any

from fastapi import status

from core.responses import ErrorEnvelope

LIST_USAGE_SUMMARY = "List storage usage by subject"
LIST_USAGE_DESCRIPTION = (
    "Returns consumption per quota subject, sortable by absolute or proportional use and "
    "filterable by how close each subject is to its limit."
)
LIST_USAGE_RESPONSES: dict[int | str, dict[str, Any]] = {
    status.HTTP_400_BAD_REQUEST: {"model": ErrorEnvelope, "description": "Invalid sort or status filter."},
}

LIST_MEMBER_USAGE_SUMMARY = "List per-member usage for an organization"
LIST_MEMBER_USAGE_DESCRIPTION = (
    "Returns owned bytes, which count against a member's cap, separately from uploaded bytes, "
    "which are attribution only and may include organization-owned files."
)
LIST_MEMBER_USAGE_RESPONSES: dict[int | str, dict[str, Any]] = {}

RECOMPUTE_USAGE_SUMMARY = "Recompute usage counters"
RECOMPUTE_USAGE_DESCRIPTION = (
    "Re-derives counters from the files and sessions themselves. The counters are a cache "
    "maintained by increments and decrements, so they can drift."
)
RECOMPUTE_USAGE_RESPONSES: dict[int | str, dict[str, Any]] = {
    status.HTTP_400_BAD_REQUEST: {"model": ErrorEnvelope, "description": "Neither a subject nor 'all' was given."},
}
