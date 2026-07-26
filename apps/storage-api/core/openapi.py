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
    {"name": "Files", "description": "File metadata, read URLs, and deletion."},
    {"name": "Uploads", "description": "Direct-to-R2 upload sessions and verification."},
    {"name": "System", "description": "Storage API liveness and readiness."},
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
        schema.setdefault("components", {})["securitySchemes"] = {
            "internalKey": {"type": "apiKey", "in": "header", "name": "x-internal-key"}
        }
        for path, operations in schema.get("paths", {}).items():
            if path.startswith("/v1/"):
                for operation in operations.values():
                    if isinstance(operation, dict):
                        operation["security"] = [{"internalKey": []}]
        app.openapi_schema = schema
        return schema

    app.openapi = custom_openapi  # type: ignore[method-assign]
