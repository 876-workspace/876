from math import floor
from time import time


def now_unix_seconds() -> int:
    return floor(time())


def to_db_unix_seconds(ts: int) -> int:
    return ts


def from_db_unix_seconds(ts: int) -> int:
    return ts


def nullable_from_db_unix_seconds(ts: int | None) -> int | None:
    return ts


def iso_to_unix_seconds(iso: str) -> int:
    from datetime import datetime

    dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    return floor(dt.timestamp())
