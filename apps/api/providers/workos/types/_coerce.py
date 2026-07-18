from __future__ import annotations

from typing import Any


def coerce_to_unix(v: Any) -> int | None:
    """Convert any date-like value to a Unix timestamp in seconds.

    Accepts: int, float, ISO 8601 string, or any object with a .timestamp() method.
    Returns None for None input.
    """
    if v is None:
        return None
    if isinstance(v, int):
        return v
    if isinstance(v, float):
        return int(v)
    if isinstance(v, str):
        from datetime import datetime

        try:
            dt = datetime.fromisoformat(v.replace("Z", "+00:00"))
            return int(dt.timestamp())
        except ValueError:
            return None
    if hasattr(v, "timestamp"):
        return int(v.timestamp())
    return None
