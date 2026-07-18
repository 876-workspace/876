from __future__ import annotations

from typing import Any

from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi

TAGS_METADATA: list[dict[str, Any]] = [
    {
        "name": "Auth",
        "description": "Password, magic-OTP, social login, email verification, session management, and password recovery flows.",
    },
    {
        "name": "OAuth",
        "description": "OAuth 2.0 + OIDC provider endpoints: authorize, token exchange, userinfo, revocation, and consent.",
        "externalDocs": {
            "description": "OAuth 2.0 RFC 6749",
            "url": "https://datatracker.ietf.org/doc/html/rfc6749",
        },
    },
    {
        "name": "Users",
        "description": "User resource management, feature-flag grants, and OAuth grant inspection.",
    },
    {
        "name": "Organizations",
        "description": "Organization CRUD and nested membership management.",
    },
    {
        "name": "Memberships",
        "description": "Membership CRUD — user ↔ organization relationships.",
    },
    {
        "name": "Features",
        "description": "Platform feature-flag registry synced with PostHog.",
    },
    {
        "name": "Registered Apps",
        "description": "OAuth application registration — create and list third-party apps.",
    },
    {
        "name": "System",
        "description": "Health and liveness checks.",
    },
]

SWAGGER_UI_PARAMETERS: dict[str, Any] = {
    "deepLinking": True,
    "displayRequestDuration": True,
    "filter": True,
    "syntaxHighlight.theme": "monokai",
    "tryItOutEnabled": True,
    "persistAuthorization": True,
}


def custom_generate_unique_id(route: Any) -> str:
    tag = route.tags[0].lower().replace(" ", "_") if route.tags else "default"
    return f"{tag}-{route.name}"


def setup_openapi(app: FastAPI) -> None:
    def custom_openapi() -> dict[str, Any]:
        if app.openapi_schema:
            return app.openapi_schema
        schema = get_openapi(
            title=app.title,
            version=app.version,
            description=app.description or "",
            routes=app.routes,
            tags=TAGS_METADATA,
        )
        schema.setdefault(
            "servers",
            [{"url": "http://localhost:4000", "description": "Local dev"}],
        )
        app.openapi_schema = schema
        return schema

    app.openapi = custom_openapi  # type: ignore[method-assign]
