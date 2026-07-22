from fastapi import APIRouter, Request, Response, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from db.schema_ownership import HEAD_REVISION, current_revision
from domains.health import docs
from domains.health.schemas import HealthResponse, ReadinessResponse

router = APIRouter(tags=["System"])


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
    summary="Check Billing API health",
    description=docs.HEALTH_DESCRIPTION,
)
async def get_health() -> HealthResponse:
    return HealthResponse()


@router.get(
    "/ready",
    response_model=ReadinessResponse,
    include_in_schema=False,
    responses={status.HTTP_503_SERVICE_UNAVAILABLE: {"model": ReadinessResponse}},
    summary="Check Billing API readiness",
    description=docs.READY_DESCRIPTION,
)
async def get_readiness(request: Request, response: Response) -> ReadinessResponse:
    engine = getattr(request.app.state, "engine", None)
    writer = request.app.state.settings.billing_writer
    if engine is None:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return ReadinessResponse(status="not_ready", migration="unavailable", writer=writer)

    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
            revision = await current_revision(connection)
    except SQLAlchemyError:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return ReadinessResponse(status="not_ready", migration="unavailable", writer=writer)

    if revision != HEAD_REVISION:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return ReadinessResponse(status="not_ready", migration="pending", writer=writer)

    return ReadinessResponse(status="ready", migration="current", writer=writer)
