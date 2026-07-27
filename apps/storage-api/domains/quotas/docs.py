from typing import Any

from fastapi import status

from core.responses import ErrorEnvelope

ENSURE_QUOTA_SUMMARY = "Upsert a quota from an entitlement"
ENSURE_QUOTA_DESCRIPTION = (
    "Idempotently applies an entitlement snapshot delivered by the identity API's outbox. "
    "A snapshot whose entitlement_version is lower than the stored one is ignored, so "
    "out-of-order delivery cannot regress a limit."
)
ENSURE_QUOTA_RESPONSES: dict[int | str, dict[str, Any]] = {
    status.HTTP_400_BAD_REQUEST: {"model": ErrorEnvelope, "description": "Invalid entitlement snapshot."},
}

LIST_QUOTAS_SUMMARY = "List storage quotas"
LIST_QUOTAS_DESCRIPTION = "Returns quotas filtered by subject type, admission status, or usage band."
LIST_QUOTAS_RESPONSES: dict[int | str, dict[str, Any]] = {
    status.HTTP_400_BAD_REQUEST: {"model": ErrorEnvelope, "description": "Invalid filter."},
}

RETRIEVE_QUOTA_SUMMARY = "Retrieve a subject's quota and usage"
RETRIEVE_QUOTA_DESCRIPTION = (
    "Returns the enforced limit alongside current consumption so a product app can render "
    "remaining space without deriving it from a rejection message."
)
RETRIEVE_QUOTA_RESPONSES: dict[int | str, dict[str, Any]] = {
    status.HTTP_404_NOT_FOUND: {"model": ErrorEnvelope, "description": "No quota for that subject."},
}
