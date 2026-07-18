"""Deletion policy helpers.

Development defaults to hard deletes so test data can be reset quickly.
Production should run with DELETION_MODE=soft so user-facing reads can hide
tombstoned rows while Console can still render deleted records with
clear status indicators.
"""

from __future__ import annotations

from core.config import get_settings
from core.timestamps import now_unix_seconds


def should_soft_delete() -> bool:
    return get_settings().deletion_mode.strip().lower() == "soft"


def deletion_values(deleted_by: str | None = None, reason: str | None = None) -> dict[str, object]:
    now = now_unix_seconds()
    return {
        "deleted_at": now,
        "deleted_by": deleted_by,
        "deletion_reason": reason,
        "updated_at": now,
    }
