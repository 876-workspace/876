import importlib
import importlib.util
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from api.v1 import router as api_v1_router
from core.config import Settings, get_settings
from core.errors import AppHTTPException
from core.logging import configure_logging, get_logger
from core.openapi import SWAGGER_UI_PARAMETERS, custom_generate_unique_id, setup_openapi
from db.session import lifespan as db_lifespan
from domains.health.router import router as health_router
from providers.base import ObjectStorageProvider

logger = get_logger(__name__)
_sentry_sdk: Any | None = None
if importlib.util.find_spec("sentry_sdk") is not None:
    _sentry_sdk = importlib.import_module("sentry_sdk")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    async with db_lifespan(app):
        yield


def create_app(
    settings: Settings | None = None,
    provider: ObjectStorageProvider | None = None,
) -> FastAPI:
    active_settings = settings or get_settings()
    configure_logging(active_settings.environment, active_settings.log_level)
    if active_settings.sentry_dsn and _sentry_sdk is not None:
        _sentry_sdk.init(
            dsn=active_settings.sentry_dsn,
            environment=active_settings.environment,
            traces_sample_rate=0.1 if active_settings.is_production else 1.0,
            send_default_pii=False,
        )

    app = FastAPI(
        title="876 Storage API",
        summary="File metadata and object storage data plane.",
        description="Owns upload sessions, R2 object verification, file metadata, read URLs, and deletion.",
        version="1.0.0",
        contact={"name": "876 Engineering"},
        license_info={"name": "Private"},
        lifespan=lifespan,
        swagger_ui_parameters=SWAGGER_UI_PARAMETERS,
        generate_unique_id_function=custom_generate_unique_id,
    )
    app.state.settings = active_settings
    app.state.storage_provider = provider
    app.add_middleware(
        CORSMiddleware,
        allow_origins=active_settings.cors_origins,
        allow_credentials=True,
        allow_methods=["DELETE", "GET", "OPTIONS", "POST", "PUT"],
        allow_headers=["Content-Type", "X-Internal-Key"],
    )

    @app.exception_handler(AppHTTPException)
    async def app_http_exception_handler(request: Request, exc: AppHTTPException) -> JSONResponse:
        logger.warning(
            "storage.client_error" if exc.status_code < 500 else "storage.error",
            code=exc.app_code,
            method=request.method,
            path=request.url.path,
            status=exc.status_code,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": {"code": exc.app_code, "message": exc.app_message}},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, _exc: RequestValidationError) -> JSONResponse:
        logger.warning("storage.request_validation_error", method=request.method, path=request.url.path)
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": {
                    "code": "storage/invalid-request",
                    "message": "The request body or parameters failed validation.",
                }
            },
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(_request: Request, exc: StarletteHTTPException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": "storage/file-not-found" if exc.status_code == 404 else "storage/invalid-request",
                    "message": "The requested resource was not found."
                    if exc.status_code == 404
                    else "The request could not be completed.",
                }
            },
        )

    app.include_router(health_router)
    app.include_router(api_v1_router)
    setup_openapi(app)
    return app


app = create_app()
