from __future__ import annotations

import hashlib
import json
from typing import Any, cast

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import get_settings
from core.id import generate_id
from core.timestamps import now_unix_seconds
from db.models import (
    Feature,
    FeatureFlagMigrationArchive,
)
from providers.posthog.client import get_posthog_client


async def capture_legacy_feature_snapshot(
    db: AsyncSession,
) -> FeatureFlagMigrationArchive:
    """Persist a complete, checksummed legacy-provider and entitlement snapshot."""

    features = await _table_rows(db, "features")
    user_grants = await _table_rows(db, "user_features")
    org_grants = await _table_rows(db, "org_features")
    user_identities = await _legacy_user_identity_rows(db)

    snapshot_data = {
        "schema_version": 1,
        "legacy_provider": {"name": "removed"},
        "local": {
            "features": features,
            "user_features": user_grants,
            "org_features": org_grants,
            "user_identities": user_identities,
        },
    }
    checksum = hashlib.sha256(_canonical_json(snapshot_data).encode()).hexdigest()
    snapshot = _normalize_json(
        {**snapshot_data, "captured_at": now_unix_seconds()}
    )
    existing = (
        await db.scalars(
            select(FeatureFlagMigrationArchive).where(
                FeatureFlagMigrationArchive.checksum == checksum
            )
        )
    ).first()
    if existing:
        return existing

    counts = {
        "local_features": len(features),
        "local_user_grants": len(user_grants),
        "local_org_grants": len(org_grants),
        "local_user_identities": len(user_identities),
    }
    archive = FeatureFlagMigrationArchive(
        id=generate_id("featureFlagMigrationArchive"),
        source_provider="legacy",
        target_provider="posthog",
        checksum=checksum,
        status="captured",
        counts=counts,
        snapshot=snapshot,
        result=None,
        created_at=now_unix_seconds(),
        completed_at=None,
    )
    db.add(archive)
    await db.flush()
    return archive


async def import_snapshot_to_posthog(
    db: AsyncSession,
    archive: FeatureFlagMigrationArchive,
) -> dict[str, Any]:
    """Idempotently create PostHog flags, then switch local provider mappings."""

    settings = get_settings()
    posthog = get_posthog_client(settings)
    existing_flags = {str(row.get("key")): row for row in await posthog.list_features()}
    local_features = list(
        (await db.scalars(select(Feature).order_by(Feature.created_at, Feature.id))).all()
    )
    mappings: list[dict[str, str]] = []
    archived_features = {
        str(row.get("id")): row
        for row in archive.snapshot.get("local", {}).get("features", [])
    }

    for feature in local_features:
        provider_flag = existing_flags.get(feature.slug)
        if provider_flag is None:
            provider_flag = await posthog.create_feature(
                key=feature.slug,
                name=feature.name,
                description=feature.description,
                enabled=feature.enabled,
            )
            existing_flags[feature.slug] = provider_flag

        provider_id = str(provider_flag["id"])
        mappings.append(
            {
                "feature_id": feature.id,
                "slug": feature.slug,
                "source_provider_feature_id": str(
                    archived_features.get(feature.id, {}).get("provider_feature_id") or ""
                ),
                "posthog_feature_id": provider_id,
            }
        )

    if len(mappings) != len(local_features):
        raise RuntimeError("PostHog migration did not map every local feature.")

    for feature in local_features:
        provider_flag = existing_flags[feature.slug]
        feature.provider = "posthog"
        feature.provider_feature_id = str(provider_flag["id"])
        feature.provider_environment_id = str(settings.posthog_project_id)
        feature.provider_metadata = provider_flag
        feature.synced_at = now_unix_seconds()
        feature.updated_at = now_unix_seconds()

    result = {
        "archive_id": archive.id,
        "checksum": archive.checksum,
        "mapped_features": len(mappings),
        "mappings": mappings,
    }
    archive.status = "completed"
    archive.result = result
    archive.completed_at = now_unix_seconds()
    await db.flush()
    return result


async def remove_legacy_feature_columns(db: AsyncSession) -> None:
    """Remove obsolete provider columns only after the archive/import commits."""

    columns_by_table = {
        "features": (
            "flagsmith_feature_id",
            "flagsmith_owners",
            "flagsmith_created_at",
            "flagsmith_updated_at",
        ),
        "user_features": ("flagsmith_identity_id", "flagsmith_featurestate_id"),
        "org_features": ("flagsmith_identity_id", "flagsmith_featurestate_id"),
        "users": (
            "flagsmith_identity_id",
            "flagsmith_identifier",
            "flagsmith_environment_id",
            "flagsmith_identity_synced_at",
        ),
    }
    for table_name, columns in columns_by_table.items():
        actions = ", ".join(f"DROP COLUMN IF EXISTS {column}" for column in columns)
        await db.execute(text(f"ALTER TABLE {table_name} {actions}"))


async def _table_rows(db: AsyncSession, table_name: str) -> list[dict[str, Any]]:
    result = await db.execute(
        text(f"SELECT to_jsonb(row_data) AS data FROM {table_name} AS row_data ORDER BY id")
    )
    return [dict(row.data) for row in result if isinstance(row.data, dict)]


async def _legacy_user_identity_rows(db: AsyncSession) -> list[dict[str, Any]]:
    columns = set(
        (
            await db.execute(
                text(
                    "SELECT column_name FROM information_schema.columns "
                    "WHERE table_name = 'users'"
                )
            )
        ).scalars()
    )
    legacy_columns = [
        "flagsmith_identity_id",
        "flagsmith_identifier",
        "flagsmith_environment_id",
        "flagsmith_identity_synced_at",
    ]
    if not set(legacy_columns).issubset(columns):
        return []

    projection = ", ".join(["id", *legacy_columns])
    result = await db.execute(text(f"SELECT {projection} FROM users ORDER BY id"))
    return [dict(row._mapping) for row in result]


def _normalize_json(value: Any) -> dict[str, Any]:
    return cast(dict[str, Any], json.loads(json.dumps(value, default=str)))


def _canonical_json(value: dict[str, Any]) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"))
