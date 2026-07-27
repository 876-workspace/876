"""The quota, usage, and file administration endpoints."""

from __future__ import annotations

from typing import Any

from tests.conftest import StorageHarness
from tests.test_quota_enforcement import _set_quota, _set_usage
from tests.test_quota_reclamation import _ready_file
from tests.test_storage_api import AUTH_HEADERS

SCHEDULER_HEADERS = {"x-scheduler-key": "scheduler-test-key"}
UPLOADED_SIZE = 84_213

ENSURE_BODY: dict[str, Any] = {
    "subject_type": "organization",
    "subject_id": "org_ensure",
    "limit_bytes": 5_368_709_120,
    "max_file_bytes": 104_857_600,
    "plan_product_id": "prod_storage",
    "plan_slug": "876-storage-included",
    "plan_name": "Included",
    "status": "active",
    "entitlement_version": 100,
}


def _ensure(harness: StorageHarness, **overrides: Any) -> Any:
    return harness.client.post(
        "/v1/admin/quotas/ensure",
        headers=AUTH_HEADERS,
        json={**ENSURE_BODY, **overrides},
    )


class TestQuotaEnsure:
    def test_ensure_creates_a_quota_from_an_entitlement(
        self, storage_harness: StorageHarness
    ) -> None:
        response = _ensure(storage_harness)

        assert response.status_code == 200
        body = response.json()
        assert body["object"] == "storage_quota"
        assert body["subject_id"] == "org_ensure"
        assert body["limit_bytes"] == 5_368_709_120
        assert body["plan_name"] == "Included"
        assert body["entitlement_version"] == 100

    def test_ensure_is_idempotent_for_the_same_snapshot(
        self, storage_harness: StorageHarness
    ) -> None:
        first = _ensure(storage_harness)
        second = _ensure(storage_harness)

        assert first.json() == second.json()

    def test_a_higher_version_applies(self, storage_harness: StorageHarness) -> None:
        _ensure(storage_harness)

        response = _ensure(
            storage_harness, limit_bytes=10_737_418_240, entitlement_version=101
        )

        assert response.json()["limit_bytes"] == 10_737_418_240
        assert response.json()["entitlement_version"] == 101

    def test_a_lower_version_is_ignored(self, storage_harness: StorageHarness) -> None:
        _ensure(storage_harness, limit_bytes=10_737_418_240, entitlement_version=101)

        response = _ensure(storage_harness, limit_bytes=1, entitlement_version=99)

        assert response.json()["limit_bytes"] == 10_737_418_240
        assert response.json()["entitlement_version"] == 101

    def test_ensure_rejects_an_unknown_field(
        self, storage_harness: StorageHarness
    ) -> None:
        response = storage_harness.client.post(
            "/v1/admin/quotas/ensure",
            headers=AUTH_HEADERS,
            json={**ENSURE_BODY, "source": "override"},
        )

        # The service normalizes request-validation failures to 400.
        assert response.status_code == 400

    def test_ensure_rejects_a_negative_limit(
        self, storage_harness: StorageHarness
    ) -> None:
        assert _ensure(storage_harness, limit_bytes=-1).status_code == 400


class TestQuotaRetrieve:
    def test_retrieve_returns_limit_alongside_consumption(
        self, storage_harness: StorageHarness
    ) -> None:
        _ready_file(storage_harness)

        response = storage_harness.client.get(
            "/v1/quotas/organization/org_123", headers=AUTH_HEADERS
        )

        assert response.status_code == 200
        body = response.json()
        assert body["object"] == "storage_usage"
        assert body["bytes_used"] == UPLOADED_SIZE
        assert body["bytes_reserved"] == 0
        assert body["bytes_total"] == UPLOADED_SIZE
        assert body["bytes_remaining"] == 10_000_000 - UPLOADED_SIZE
        assert body["files_count"] == 1

    def test_remaining_is_null_for_an_unlimited_subject(
        self, storage_harness: StorageHarness
    ) -> None:
        _set_quota(storage_harness, subject_id="org_unlimited", limit_bytes=None)
        _set_usage(storage_harness, subject_id="org_unlimited", bytes_used=10)

        response = storage_harness.client.get(
            "/v1/quotas/organization/org_unlimited", headers=AUTH_HEADERS
        )

        assert response.json()["limit_bytes"] is None
        assert response.json()["bytes_remaining"] is None

    def test_remaining_clamps_at_zero_when_over_limit(
        self, storage_harness: StorageHarness
    ) -> None:
        _set_quota(storage_harness, subject_id="org_over", limit_bytes=100)
        _set_usage(storage_harness, subject_id="org_over", bytes_used=250)

        response = storage_harness.client.get(
            "/v1/quotas/organization/org_over", headers=AUTH_HEADERS
        )

        assert response.json()["bytes_remaining"] == 0

    def test_unknown_subject_is_not_found(
        self, storage_harness: StorageHarness
    ) -> None:
        response = storage_harness.client.get(
            "/v1/quotas/organization/org_missing", headers=AUTH_HEADERS
        )

        assert response.status_code == 404
        assert response.json()["error"]["code"] == "storage/quota-not-found"


class TestUsageList:
    def _seed_three(self, harness: StorageHarness) -> None:
        _set_quota(harness, subject_id="org_small", limit_bytes=1_000)
        _set_usage(harness, subject_id="org_small", bytes_used=100)
        _set_quota(harness, subject_id="org_near", limit_bytes=1_000)
        _set_usage(harness, subject_id="org_near", bytes_used=850)
        _set_quota(harness, subject_id="org_full", limit_bytes=1_000)
        _set_usage(harness, subject_id="org_full", bytes_used=1_000)

    def test_list_returns_a_list_object(self, storage_harness: StorageHarness) -> None:
        self._seed_three(storage_harness)

        response = storage_harness.client.get(
            "/v1/admin/usage", headers=AUTH_HEADERS
        )

        assert response.status_code == 200
        assert response.json()["object"] == "list"
        assert response.json()["has_more"] is False

    def test_default_sort_is_most_used_first(
        self, storage_harness: StorageHarness
    ) -> None:
        self._seed_three(storage_harness)

        response = storage_harness.client.get(
            "/v1/admin/usage", headers=AUTH_HEADERS
        )

        ids = [row["subject_id"] for row in response.json()["data"]]
        assert ids[:3] == ["org_full", "org_near", "org_small"]

    def test_used_asc_reverses_the_order(
        self, storage_harness: StorageHarness
    ) -> None:
        self._seed_three(storage_harness)

        response = storage_harness.client.get(
            "/v1/admin/usage?sort=used_asc", headers=AUTH_HEADERS
        )

        ids = [row["subject_id"] for row in response.json()["data"]]
        assert ids[0] == "org_small"

    def test_near_limit_band_excludes_ok_and_over(
        self, storage_harness: StorageHarness
    ) -> None:
        self._seed_three(storage_harness)

        response = storage_harness.client.get(
            "/v1/admin/usage?status=near_limit", headers=AUTH_HEADERS
        )

        assert [row["subject_id"] for row in response.json()["data"]] == ["org_near"]

    def test_over_limit_band_includes_exactly_at_the_limit(
        self, storage_harness: StorageHarness
    ) -> None:
        self._seed_three(storage_harness)

        response = storage_harness.client.get(
            "/v1/admin/usage?status=over_limit", headers=AUTH_HEADERS
        )

        assert [row["subject_id"] for row in response.json()["data"]] == ["org_full"]

    def test_eighty_percent_is_the_near_limit_boundary(
        self, storage_harness: StorageHarness
    ) -> None:
        _set_quota(storage_harness, subject_id="org_edge", limit_bytes=1_000)
        _set_usage(storage_harness, subject_id="org_edge", bytes_used=800)

        response = storage_harness.client.get(
            "/v1/admin/usage?status=near_limit", headers=AUTH_HEADERS
        )

        assert "org_edge" in [row["subject_id"] for row in response.json()["data"]]

    def test_just_under_eighty_percent_is_ok(
        self, storage_harness: StorageHarness
    ) -> None:
        _set_quota(storage_harness, subject_id="org_edge", limit_bytes=1_000)
        _set_usage(storage_harness, subject_id="org_edge", bytes_used=799)

        near = storage_harness.client.get(
            "/v1/admin/usage?status=near_limit", headers=AUTH_HEADERS
        )
        ok = storage_harness.client.get(
            "/v1/admin/usage?status=ok", headers=AUTH_HEADERS
        )

        assert "org_edge" not in [row["subject_id"] for row in near.json()["data"]]
        assert "org_edge" in [row["subject_id"] for row in ok.json()["data"]]

    def test_reserved_bytes_count_toward_the_band(
        self, storage_harness: StorageHarness
    ) -> None:
        _set_quota(storage_harness, subject_id="org_res", limit_bytes=1_000)
        _set_usage(
            storage_harness, subject_id="org_res", bytes_used=500, bytes_reserved=500
        )

        response = storage_harness.client.get(
            "/v1/admin/usage?status=over_limit", headers=AUTH_HEADERS
        )

        assert "org_res" in [row["subject_id"] for row in response.json()["data"]]

    def test_limit_caps_the_page_and_reports_more(
        self, storage_harness: StorageHarness
    ) -> None:
        self._seed_three(storage_harness)

        response = storage_harness.client.get(
            "/v1/admin/usage?limit=2", headers=AUTH_HEADERS
        )

        assert len(response.json()["data"]) == 2
        assert response.json()["has_more"] is True

    def test_an_unsupported_sort_is_rejected(
        self, storage_harness: StorageHarness
    ) -> None:
        assert (
            storage_harness.client.get(
                "/v1/admin/usage?sort=sideways", headers=AUTH_HEADERS
            ).status_code
            == 400
        )


class TestMemberBreakdown:
    def test_owned_and_uploaded_are_reported_separately(
        self, storage_harness: StorageHarness
    ) -> None:
        # The org logo is owned by the org and uploaded by user_456.
        _ready_file(storage_harness)

        response = storage_harness.client.get(
            "/v1/admin/usage/org_123/members", headers=AUTH_HEADERS
        )

        assert response.status_code == 200
        rows = response.json()["data"]
        assert len(rows) == 1
        row = rows[0]
        assert row["object"] == "storage_member_usage"
        assert row["user_id"] == "user_456"
        # Uploaded, but org-owned: attribution only, never against their cap.
        assert row["uploaded_bytes"] == UPLOADED_SIZE
        assert row["uploaded_files"] == 1
        assert row["owned_bytes"] == 0
        assert row["owned_files"] == 0

    def test_an_organization_with_no_files_returns_an_empty_list(
        self, storage_harness: StorageHarness
    ) -> None:
        response = storage_harness.client.get(
            "/v1/admin/usage/org_empty/members", headers=AUTH_HEADERS
        )

        assert response.json()["data"] == []
        assert response.json()["total_count"] == 0


class TestRecompute:
    def test_recompute_repairs_a_named_subject(
        self, storage_harness: StorageHarness
    ) -> None:
        _ready_file(storage_harness)
        _set_usage(storage_harness, bytes_used=999, files_count=9)

        response = storage_harness.client.post(
            "/v1/admin/usage/recompute",
            headers=AUTH_HEADERS,
            json={"subject_type": "organization", "subject_id": "org_123"},
        )

        assert response.status_code == 200
        result = response.json()["data"][0]
        assert result["object"] == "storage_usage_recompute"
        assert result["bytes_used"] == UPLOADED_SIZE
        assert result["files_count"] == 1
        assert result["delta_bytes"] == UPLOADED_SIZE - 999

    def test_recompute_all_visits_every_subject(
        self, storage_harness: StorageHarness
    ) -> None:
        _set_usage(storage_harness, subject_id="org_a", bytes_used=5)
        _set_usage(storage_harness, subject_id="org_b", bytes_used=5)

        response = storage_harness.client.post(
            "/v1/admin/usage/recompute", headers=AUTH_HEADERS, json={"all": True}
        )

        assert response.json()["total_count"] == 2

    def test_recompute_without_a_subject_or_all_is_rejected(
        self, storage_harness: StorageHarness
    ) -> None:
        response = storage_harness.client.post(
            "/v1/admin/usage/recompute", headers=AUTH_HEADERS, json={}
        )

        assert response.status_code == 400
        assert response.json()["error"]["code"] == "storage/invalid-request"


class TestAdminFileList:
    def test_list_returns_the_file(self, storage_harness: StorageHarness) -> None:
        _ready_file(storage_harness)

        response = storage_harness.client.get("/v1/files", headers=AUTH_HEADERS)

        assert response.status_code == 200
        assert response.json()["object"] == "list"
        assert len(response.json()["data"]) == 1
        assert response.json()["data"][0]["object"] == "file"

    def test_filtering_by_uploader_matches(
        self, storage_harness: StorageHarness
    ) -> None:
        _ready_file(storage_harness)

        response = storage_harness.client.get(
            "/v1/files?created_by=user_456", headers=AUTH_HEADERS
        )

        assert len(response.json()["data"]) == 1

    def test_filtering_by_a_different_uploader_excludes(
        self, storage_harness: StorageHarness
    ) -> None:
        _ready_file(storage_harness)

        response = storage_harness.client.get(
            "/v1/files?created_by=user_other", headers=AUTH_HEADERS
        )

        assert response.json()["data"] == []

    def test_deleted_files_are_hidden_by_default(
        self, storage_harness: StorageHarness
    ) -> None:
        file_id = _ready_file(storage_harness)
        storage_harness.client.delete(f"/v1/files/{file_id}", headers=AUTH_HEADERS)

        response = storage_harness.client.get("/v1/files", headers=AUTH_HEADERS)

        assert response.json()["data"] == []

    def test_deleted_files_appear_only_when_asked_for(
        self, storage_harness: StorageHarness
    ) -> None:
        file_id = _ready_file(storage_harness)
        storage_harness.client.delete(f"/v1/files/{file_id}", headers=AUTH_HEADERS)

        response = storage_harness.client.get(
            "/v1/files?include_deleted=true", headers=AUTH_HEADERS
        )

        assert len(response.json()["data"]) == 1
        assert response.json()["data"][0]["status"] == "deleted"

    def test_filtering_by_category_matches_the_route_policy(
        self, storage_harness: StorageHarness
    ) -> None:
        _ready_file(storage_harness)

        attachment = storage_harness.client.get(
            "/v1/files?category=attachment", headers=AUTH_HEADERS
        )
        library = storage_harness.client.get(
            "/v1/files?category=library", headers=AUTH_HEADERS
        )

        assert len(attachment.json()["data"]) == 1
        assert library.json()["data"] == []


class TestAdminAuth:
    ADMIN_PATHS = (
        ("get", "/v1/admin/quotas"),
        ("get", "/v1/admin/usage"),
        ("get", "/v1/admin/usage/org_123/members"),
        ("get", "/v1/quotas/organization/org_123"),
        ("get", "/v1/files"),
    )

    def test_admin_reads_reject_a_missing_key(
        self, storage_harness: StorageHarness
    ) -> None:
        for method, path in self.ADMIN_PATHS:
            response = getattr(storage_harness.client, method)(path)
            assert response.status_code == 401, path

    def test_admin_reads_reject_a_wrong_key(
        self, storage_harness: StorageHarness
    ) -> None:
        for method, path in self.ADMIN_PATHS:
            response = getattr(storage_harness.client, method)(
                path, headers={"x-internal-key": "wrong"}
            )
            assert response.status_code == 401, path

    def test_admin_reads_reject_the_scheduler_key(
        self, storage_harness: StorageHarness
    ) -> None:
        for method, path in self.ADMIN_PATHS:
            response = getattr(storage_harness.client, method)(
                path, headers=SCHEDULER_HEADERS
            )
            assert response.status_code == 401, path

    def test_ensure_rejects_a_missing_key(
        self, storage_harness: StorageHarness
    ) -> None:
        response = storage_harness.client.post(
            "/v1/admin/quotas/ensure", json=ENSURE_BODY
        )

        assert response.status_code == 401

    def test_recompute_rejects_the_scheduler_key(
        self, storage_harness: StorageHarness
    ) -> None:
        response = storage_harness.client.post(
            "/v1/admin/usage/recompute",
            headers=SCHEDULER_HEADERS,
            json={"all": True},
        )

        assert response.status_code == 401
