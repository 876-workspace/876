from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

AuthTier = Literal["admin", "integration", "tenant"]


@dataclass(frozen=True)
class RouteSpec:
    path: str
    method: str
    auth_tier: AuthTier
    permission: str | None
    scope: str | None
    source: str
