from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import get_settings
from core.errors import AppHTTPException
from db.session import get_db
from providers.twilio.signatures import TwilioWebhookVerifier

from .service import TwilioWebhookService

router = APIRouter(prefix="/webhooks/twilio", tags=["Twilio Webhooks"])


async def _validate(request: Request, payload: dict[str, str]) -> None:
    settings = getattr(request.app.state, "settings", None) or get_settings()
    signature = request.headers.get("X-Twilio-Signature", "")
    path = request.url.path
    if request.url.query:
        path += "?" + request.url.query
    valid = bool(settings.twilio_auth_token and settings.twilio_webhook_base_url) and TwilioWebhookVerifier(
        auth_token=settings.twilio_auth_token, webhook_base_url=settings.twilio_webhook_base_url
    ).validate(path=path, params=payload, signature=signature)
    if not valid:
        raise AppHTTPException(
            code="communications/invalid-webhook-signature", message="Invalid webhook signature.", http_status_code=403
        )


@router.post("/messages/status")
async def message_status(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, bool]:
    form = await request.form()
    # Include unknown future Twilio form fields in validation, exactly as Twilio
    # included them in its signature. Processing itself remains deliberately narrow.
    payload = {str(key): str(value) for key, value in form.items()}
    await _validate(request, payload)
    processed = await TwilioWebhookService(db).apply_message_status(payload)
    return {"processed": processed}


@router.post("/messages/inbound")
async def message_inbound(request: Request, db: Annotated[AsyncSession, Depends(get_db)]) -> dict[str, bool]:
    form = await request.form()
    payload = {str(key): str(value) for key, value in form.items()}
    await _validate(request, payload)
    # Inbound persistence is deliberately deferred: do not retain sender text by default.
    return {"processed": True}
