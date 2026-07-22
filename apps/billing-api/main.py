import importlib
import importlib.util
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from api.v1 import router as api_v1_router
from core.config import Settings, get_settings
from core.errors import AppHTTPException
from core.logging import configure_logging, get_logger
from core.middleware import APIEnvelopeMiddleware, RequestLoggingMiddleware
from core.openapi import SWAGGER_UI_PARAMETERS, custom_generate_unique_id, setup_openapi
from db.session import lifespan as db_lifespan
from domains.health.router import router as health_router

logger = get_logger(__name__)
_sentry_sdk: Any | None = None
if importlib.util.find_spec("sentry_sdk") is not None:
    _sentry_sdk = importlib.import_module("sentry_sdk")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    async with db_lifespan(app):
        yield


def create_app(settings: Settings | None = None) -> FastAPI:
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
        title="876 Billing API",
        summary="Financial data plane for 876 Billing.",
        description=(
            "Owns Billing database access, financial business rules, provider "
            "integrations, and versioned HTTP contracts."
        ),
        version="0.1.0",
        contact={"name": "876 Engineering"},
        license_info={"name": "Private"},
        lifespan=lifespan,
        swagger_ui_parameters=SWAGGER_UI_PARAMETERS,
        generate_unique_id_function=custom_generate_unique_id,
    )
    app.state.settings = active_settings
    app.add_middleware(
        CORSMiddleware,
        allow_origins=active_settings.cors_origins,
        allow_credentials=True,
        allow_methods=["DELETE", "GET", "OPTIONS", "PATCH", "POST", "PUT"],
        allow_headers=[
            "Authorization",
            "Content-Type",
            "Idempotency-Key",
            "X-876-API-Key",
            "X-Internal-Key",
            "X-Request-Id",
        ],
    )
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(APIEnvelopeMiddleware)

    @app.exception_handler(AppHTTPException)
    async def app_http_exception_handler(request: Request, exc: AppHTTPException) -> JSONResponse:
        logger.warning(
            "app_client_error" if exc.status_code < 500 else "app_error",
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
    async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        logger.warning("request_validation_error", method=request.method, path=request.url.path)
        details = [
            {key: value for key, value in error.items() if key in ("loc", "msg", "type")} for error in exc.errors()
        ]
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "validation/invalid-request",
                    "message": "The request body or parameters failed validation.",
                    "details": details,
                }
            },
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        code = "error/not-found" if exc.status_code == 404 else "error/http"
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": {"code": code, "message": str(exc.detail)}},
        )

    app.include_router(health_router)
    app.include_router(api_v1_router)
    setup_openapi(app)
    return app


app = create_app()
