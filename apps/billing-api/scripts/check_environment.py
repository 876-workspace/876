#!/usr/bin/env python3
"""Validate production Billing API settings without printing secret values."""

from __future__ import annotations

import json

from core.config import Settings, get_settings


def missing_production_settings(settings: Settings) -> list[str]:
    required = {
        "API_URL": settings.identity_api_url,
        "BILLING_API_876_KEY": settings.identity_api_key,
        "BILLING_DATABASE_URL": settings.database_url,
        "BILLING_INTERNAL_KEY": settings.internal_key,
        "CORS_ALLOWED_ORIGINS": settings.cors_allowed_origins,
    }
    missing = {name for name, value in required.items() if not value.strip()}
    if settings.is_production:
        if "localhost" in settings.identity_api_url or "127.0.0.1" in settings.identity_api_url:
            missing.add("API_URL")
        if any("localhost" in origin or "127.0.0.1" in origin for origin in settings.cors_origins):
            missing.add("CORS_ALLOWED_ORIGINS")
    return sorted(missing)


def main() -> int:
    settings = get_settings()
    missing = missing_production_settings(settings)
    if missing:
        print(
            json.dumps(
                {
                    "object": "billing_environment_check",
                    "valid": False,
                    "missing": missing,
                },
                separators=(",", ":"),
            )
        )
        return 1
    print(
        json.dumps(
            {
                "object": "billing_environment_check",
                "valid": True,
                "writer": settings.billing_writer,
            },
            separators=(",", ":"),
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
