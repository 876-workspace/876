from __future__ import annotations

import hmac
from typing import Annotated

from fastapi import APIRouter, Depends, Request
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import get_settings
from core.errors import AppHTTPException
from db.session import get_db
from domains.communications.service import VOICE_TEMPLATES, voice_template_signature
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


@router.post("/calls/status")
async def call_status(request: Request, db: Annotated[AsyncSession, Depends(get_db)]) -> dict[str, bool]:
    form = await request.form()
    payload = {str(key): str(value) for key, value in form.items()}
    await _validate(request, payload)
    processed = await TwilioWebhookService(db).apply_call_status(payload)
    return {"processed": processed}


@router.post("/calls/inbound")
async def call_inbound(request: Request, db: Annotated[AsyncSession, Depends(get_db)]) -> Response:
    form = await request.form()
    payload = {str(key): str(value) for key, value in form.items()}
    await _validate(request, payload)
    await TwilioWebhookService(db).record_inbound_call(payload)
    return Response(content="<Response/>", media_type="application/xml")


@router.post("/voice")
async def voice_twiml(request: Request) -> Response:
    # Only a Twilio-signed request for an HMAC-bound platform template may fetch
    # this URL. The selected content never derives from form/query input.
    payload = {str(key): str(value) for key, value in (await request.form()).items()}
    await _validate(request, payload)
    settings = getattr(request.app.state, "settings", None) or get_settings()
    template_key = request.query_params.get("template_key", "")
    signature = request.query_params.get("signature", "")
    expected = voice_template_signature(auth_token=settings.twilio_auth_token, template_key=template_key)
    if not template_key or template_key not in VOICE_TEMPLATES or not hmac.compare_digest(signature, expected):
        raise AppHTTPException(
            code="communications/invalid-template",
            message="The requested voice template is unavailable.",
            http_status_code=400,
        )
    return Response(content=VOICE_TEMPLATES[template_key], media_type="application/xml")
