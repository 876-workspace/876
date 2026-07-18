from typing import Any

import httpx

from providers.posthog.client import PostHogClient


class _FakeAsyncClient:
    def __init__(self, response: httpx.Response) -> None:
        self.response = response
        self.calls: list[tuple[str, str, dict[str, Any] | None]] = []

    async def __aenter__(self) -> "_FakeAsyncClient":
        return self

    async def __aexit__(self, *_args: object) -> None:
        return None

    async def request(
        self,
        method: str,
        url: str,
        *,
        headers: dict[str, str],
        json: dict[str, Any] | None,
    ) -> httpx.Response:
        assert headers["Authorization"] == "Bearer test-personal-key"
        self.calls.append((method, url, json))
        return self.response


def _client() -> PostHogClient:
    return PostHogClient(
        host="https://us.posthog.com",
        project_id=293071,
        personal_api_key="test-personal-key",
    )


async def test_create_feature_is_server_evaluated(monkeypatch: Any) -> None:
    response = httpx.Response(
        201,
        request=httpx.Request("POST", "https://us.posthog.com"),
        json={"id": 42, "key": "billing_search_bar", "active": True},
    )
    fake = _FakeAsyncClient(response)
    monkeypatch.setattr(httpx, "AsyncClient", lambda **_kwargs: fake)

    result = await _client().create_feature(
        key="billing_search_bar",
        name="Search bar",
        description="Controls Billing search.",
        enabled=True,
    )

    assert result["id"] == 42
    assert fake.calls == [
        (
            "POST",
            "https://us.posthog.com/api/projects/293071/feature_flags/",
            {
                "key": "billing_search_bar",
                "name": "Controls Billing search.",
                "active": True,
                "filters": {"groups": [{"properties": [], "rollout_percentage": 100}]},
                "evaluation_runtime": "server",
            },
        )
    ]


async def test_delete_feature_accepts_no_content(monkeypatch: Any) -> None:
    response = httpx.Response(
        204,
        request=httpx.Request("DELETE", "https://us.posthog.com"),
    )
    fake = _FakeAsyncClient(response)
    monkeypatch.setattr(httpx, "AsyncClient", lambda **_kwargs: fake)

    await _client().delete_feature("42")

    assert fake.calls == [
        (
            "DELETE",
            "https://us.posthog.com/api/projects/293071/feature_flags/42/",
            None,
        )
    ]


async def test_update_feature_can_migrate_a_flag_key(monkeypatch: Any) -> None:
    response = httpx.Response(
        200,
        request=httpx.Request("PATCH", "https://us.posthog.com"),
        json={"id": 42, "key": "billing_widgets_notepad", "active": True},
    )
    fake = _FakeAsyncClient(response)
    monkeypatch.setattr(httpx, "AsyncClient", lambda **_kwargs: fake)

    await _client().update_feature(
        "42",
        key="billing_widgets_notepad",
        description="Controls the Notepad widget.",
    )

    assert fake.calls == [
        (
            "PATCH",
            "https://us.posthog.com/api/projects/293071/feature_flags/42/",
            {
                "key": "billing_widgets_notepad",
                "name": "Controls the Notepad widget.",
            },
        )
    ]
