from typing import Any

from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi

SWAGGER_UI_PARAMETERS: dict[str, Any] = {
    "deepLinking": True,
    "displayRequestDuration": True,
    "filter": True,
    "persistAuthorization": True,
    "tryItOutEnabled": True,
}

TAGS_METADATA: list[dict[str, Any]] = [
    {"name": "System", "description": "Billing API liveness and readiness."},
]


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
        schema["paths"] = {
            path.removeprefix("/api/v1"): operation
            for path, operation in schema["paths"].items()
            if path.startswith("/api/v1")
        }
        schema["servers"] = [{"url": "/api/v1"}]
        identity_api_url = app.state.settings.identity_api_url.rstrip("/")
        components = schema.setdefault("components", {})
        components["securitySchemes"] = {
            "tenantOAuth": {
                "type": "oauth2",
                "description": "Delegated 876 access token for an active Billing organization member.",
                "flows": {
                    "authorizationCode": {
                        "authorizationUrl": f"{identity_api_url}/api/v1/oauth/authorize",
                        "tokenUrl": f"{identity_api_url}/api/v1/oauth/token",
                        "scopes": {},
                    }
                },
            },
            "appApiKey": {"type": "apiKey", "in": "header", "name": "x-876-api-key"},
            "internalKey": {"type": "apiKey", "in": "header", "name": "x-internal-key"},
            "schedulerKey": {"type": "apiKey", "in": "header", "name": "x-scheduler-key"},
        }
        app.openapi_schema = schema
        return schema

    app.openapi = custom_openapi  # type: ignore[method-assign]
