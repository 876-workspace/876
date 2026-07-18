from __future__ import annotations

import time
from typing import Any, cast
from urllib.parse import urlencode

import httpx

from core.logging import get_logger
from providers.workos.errors import normalize_workos_error

logger = get_logger(__name__)


class WorkOSClient:
    def __init__(self, api_key: str, base_url: str = "https://api.workos.com") -> None:
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self._client = httpx.AsyncClient(
            base_url=self._base_url,
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=15.0,
        )

    async def _post(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        start = time.perf_counter()
        try:
            resp = await self._client.post(path, json={k: v for k, v in payload.items() if v is not None})
            resp.raise_for_status()
            return cast(dict[str, Any], resp.json())
        except httpx.HTTPStatusError as exc:
            elapsed_ms = (time.perf_counter() - start) * 1000
            status = exc.response.status_code
            if status >= 500:
                logger.error(
                    "workos.request_failed",
                    method="POST",
                    path=path,
                    status=status,
                    latency_ms=elapsed_ms,
                    exc_info=True,
                )
            else:
                logger.warning("workos.request_failed", method="POST", path=path, status=status, latency_ms=elapsed_ms)
            raise normalize_workos_error(exc) from exc
        except httpx.HTTPError:
            elapsed_ms = (time.perf_counter() - start) * 1000
            logger.error("workos.request_error", method="POST", path=path, latency_ms=elapsed_ms, exc_info=True)
            raise

    async def _get(self, path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        start = time.perf_counter()
        try:
            resp = await self._client.get(path, params={k: v for k, v in (params or {}).items() if v is not None})
            resp.raise_for_status()
            return cast(dict[str, Any], resp.json())
        except httpx.HTTPStatusError as exc:
            elapsed_ms = (time.perf_counter() - start) * 1000
            status = exc.response.status_code
            if status >= 500:
                logger.error(
                    "workos.request_failed",
                    method="GET",
                    path=path,
                    status=status,
                    latency_ms=elapsed_ms,
                    exc_info=True,
                )
            else:
                logger.warning("workos.request_failed", method="GET", path=path, status=status, latency_ms=elapsed_ms)
            raise normalize_workos_error(exc) from exc
        except httpx.HTTPError:
            elapsed_ms = (time.perf_counter() - start) * 1000
            logger.error("workos.request_error", method="GET", path=path, latency_ms=elapsed_ms, exc_info=True)
            raise

    async def _delete(self, path: str) -> None:
        start = time.perf_counter()
        try:
            resp = await self._client.delete(path)
            resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            elapsed_ms = (time.perf_counter() - start) * 1000
            status = exc.response.status_code
            if status >= 500:
                logger.error(
                    "workos.request_failed",
                    method="DELETE",
                    path=path,
                    status=status,
                    latency_ms=elapsed_ms,
                    exc_info=True,
                )
            else:
                logger.warning(
                    "workos.request_failed", method="DELETE", path=path, status=status, latency_ms=elapsed_ms
                )
            raise normalize_workos_error(exc) from exc
        except httpx.HTTPError:
            elapsed_ms = (time.perf_counter() - start) * 1000
            logger.error("workos.request_error", method="DELETE", path=path, latency_ms=elapsed_ms, exc_info=True)
            raise

    async def authenticate_with_password(
        self,
        email: str,
        password: str,
        client_id: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> dict[str, Any]:
        return await self._post(
            "/user_management/authenticate",
            {
                "grant_type": "password",
                "email": email,
                "password": password,
                "client_id": client_id,
                "client_secret": self._api_key,
                "ip_address": ip_address,
                "user_agent": user_agent,
            },
        )

    async def authenticate_with_code(
        self,
        code: str,
        client_id: str,
        code_verifier: str | None = None,
        invitation_token: str | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> dict[str, Any]:
        return await self._post(
            "/user_management/authenticate",
            {
                "grant_type": "authorization_code",
                "code": code,
                "client_id": client_id,
                "client_secret": self._api_key,
                "code_verifier": code_verifier,
                "invitation_token": invitation_token,
                "ip_address": ip_address,
                "user_agent": user_agent,
            },
        )

    async def authenticate_with_refresh_token(
        self,
        refresh_token: str,
        client_id: str,
        organization_id: str | None = None,
    ) -> dict[str, Any]:
        return await self._post(
            "/user_management/authenticate",
            {
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "client_id": client_id,
                "client_secret": self._api_key,
                "organization_id": organization_id,
            },
        )

    async def authenticate_with_email_verification(
        self,
        code: str,
        pending_authentication_token: str,
        client_id: str,
    ) -> dict[str, Any]:
        return await self._post(
            "/user_management/authenticate",
            {
                "grant_type": "urn:workos:oauth:grant-type:email-verification:code",
                "code": code,
                "pending_authentication_token": pending_authentication_token,
                "client_id": client_id,
                "client_secret": self._api_key,
            },
        )

    async def authenticate_with_magic_auth(
        self,
        code: str,
        email: str,
        client_id: str,
        link_authorization_code: str | None = None,
    ) -> dict[str, Any]:
        return await self._post(
            "/user_management/authenticate",
            {
                "grant_type": "urn:workos:oauth:grant-type:magic-auth:code",
                "code": code,
                "email": email,
                "client_id": client_id,
                "client_secret": self._api_key,
                "link_authorization_code": link_authorization_code,
            },
        )

    async def create_user(
        self,
        email: str,
        password: str | None = None,
        first_name: str | None = None,
        last_name: str | None = None,
        email_verified: bool = False,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        return await self._post(
            "/user_management/users",
            {
                "email": email,
                "password": password,
                "first_name": first_name,
                "last_name": last_name,
                "email_verified": email_verified,
                "metadata": metadata,
            },
        )

    async def list_users(self, *, email: str) -> list[dict[str, Any]]:
        body = await self._get("/user_management/users", params={"email": email})
        return list(body.get("data", []))

    async def delete_user(self, user_id: str) -> None:
        await self._delete(f"/user_management/users/{user_id}")

    async def create_magic_auth(self, email: str, client_id: str) -> dict[str, Any]:
        return await self._post(
            "/user_management/magic_auth",
            {
                "email": email,
                "client_id": client_id,
            },
        )

    async def create_password_reset(self, email: str, client_id: str) -> dict[str, Any]:
        return await self._post(
            "/user_management/password_reset",
            {
                "email": email,
                "client_id": client_id,
            },
        )

    async def reset_password(self, token: str, new_password: str) -> dict[str, Any]:
        return await self._post(
            "/user_management/password_reset/confirm",
            {
                "token": token,
                "new_password": new_password,
            },
        )

    async def create_organization(
        self,
        name: str,
        domain_data: list[dict[str, Any]] | None = None,
        external_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {"name": name}
        if domain_data is not None:
            payload["domain_data"] = domain_data
        if external_id is not None:
            payload["external_id"] = external_id
        if metadata is not None:
            payload["metadata"] = metadata
        return await self._post("/organizations", payload)

    async def delete_organization(self, organization_id: str) -> None:
        await self._delete(f"/organizations/{organization_id}")

    async def create_organization_membership(
        self,
        user_id: str,
        organization_id: str,
        role_slug: str | None = None,
    ) -> dict[str, Any]:
        return await self._post(
            "/user_management/organization_memberships",
            {
                "user_id": user_id,
                "organization_id": organization_id,
                "role_slug": role_slug,
            },
        )

    def get_authorization_url(
        self,
        client_id: str,
        redirect_uri: str,
        provider: str | None = None,
        screen_hint: str | None = None,
        login_hint: str | None = None,
        state: str | None = None,
    ) -> str:
        params: dict[str, str] = {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
        }
        if provider is not None:
            params["provider"] = provider
        if screen_hint is not None:
            params["screen_hint"] = screen_hint
        if login_hint is not None:
            params["login_hint"] = login_hint
        if state is not None:
            params["state"] = state
        return f"{self._base_url}/sso/authorize?{urlencode(params)}"

    async def revoke_session(self, session_id: str) -> None:
        try:
            resp = await self._client.post(f"/user_management/sessions/{session_id}/revoke")
            resp.raise_for_status()
            logger.info("workos.session_revoked", session_id=session_id)
        except httpx.HTTPStatusError as exc:
            logger.warning(
                "workos.revoke_session_failed",
                session_id=session_id,
                status=exc.response.status_code,
                exc_info=True,
            )
            raise normalize_workos_error(exc) from exc

    async def list_feature_flags(self, limit: int = 100) -> list[dict[str, Any]]:
        result = await self._get("/feature-flags", params={"limit": limit})
        return list(result.get("data", []))

    async def get_feature_flag(self, slug: str) -> dict[str, Any]:
        return await self._get(f"/feature-flags/{slug}")

    async def add_feature_flag_target(self, slug: str, target_id: str) -> dict[str, Any]:
        try:
            resp = await self._client.post(f"/feature-flags/{slug}/targets/{target_id}")
            resp.raise_for_status()
            logger.info("workos.feature_target_added", slug=slug, target_id=target_id)
            return cast(dict[str, Any], resp.json())
        except httpx.HTTPStatusError as exc:
            logger.warning(
                "workos.add_feature_target_failed",
                slug=slug,
                target_id=target_id,
                status=exc.response.status_code,
                exc_info=True,
            )
            raise normalize_workos_error(exc) from exc

    async def remove_feature_flag_target(self, slug: str, target_id: str) -> None:
        try:
            resp = await self._client.delete(f"/feature-flags/{slug}/targets/{target_id}")
            resp.raise_for_status()
            logger.info("workos.feature_target_removed", slug=slug, target_id=target_id)
        except httpx.HTTPStatusError as exc:
            logger.warning(
                "workos.remove_feature_target_failed",
                slug=slug,
                target_id=target_id,
                status=exc.response.status_code,
                exc_info=True,
            )
            raise normalize_workos_error(exc) from exc

    async def get_jwks(self, client_id: str) -> dict[str, Any]:
        return await self._get(f"/sso/jwks/{client_id}")


_client_cache: WorkOSClient | None = None


def get_workos_client(settings: Any) -> WorkOSClient:
    global _client_cache
    if _client_cache is None:
        _client_cache = WorkOSClient(api_key=settings.workos_api_key)
    return _client_cache
