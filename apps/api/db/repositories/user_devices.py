from __future__ import annotations

from typing import Any

from sqlalchemy import ColumnElement, or_, select

from core.id import generate_id
from core.timestamps import now_unix_seconds
from db.models import UserDevice
from db.repositories.base import BaseRepository


class UserDeviceRepository(BaseRepository):
    async def record_seen(self, *, user_id: str, fingerprint: str, now: int, **values: Any) -> UserDevice:
        row = (
            await self.db.scalars(
                select(UserDevice).where(UserDevice.user_id == user_id, UserDevice.fingerprint == fingerprint)
            )
        ).first()
        if row is None:
            row = UserDevice(
                id=generate_id("device"),
                user_id=user_id,
                fingerprint=fingerprint,
                first_seen_at=now,
                last_seen_at=now,
                created_at=now,
                updated_at=now,
                sign_in_count=1,
                **values,
            )
            self.db.add(row)
        else:
            for key, value in values.items():
                setattr(row, key, value)
            row.last_seen_at = now
            row.updated_at = now
            row.sign_in_count += 1
        await self.db.flush()
        await self.db.refresh(row)
        return row

    async def retrieve(self, device_id: str) -> UserDevice | None:
        return await self.db.get(UserDevice, device_id)

    async def list_for_user(self, user_id: str, limit: int = 20) -> list[UserDevice]:
        return list(
            (
                await self.db.scalars(
                    select(UserDevice)
                    .where(UserDevice.user_id == user_id)
                    .order_by(UserDevice.last_seen_at.desc())
                    .limit(limit)
                )
            ).all()
        )

    async def list_by_fingerprint(self, fingerprint: str) -> list[UserDevice]:
        return list((await self.db.scalars(select(UserDevice).where(UserDevice.fingerprint == fingerprint))).all())

    async def list(
        self,
        *,
        limit: int = 25,
        starting_after: str | None = None,
        ending_before: str | None = None,
        user_id: str | None = None,
        fingerprint: str | None = None,
        device_type: str | None = None,
        trusted: bool | None = None,
        blocked: bool | None = None,
        query: str | None = None,
    ) -> tuple[list[UserDevice], bool]:
        """Most-recently-seen-first device list for the admin surface."""
        filters: list[ColumnElement[bool]] = []
        if user_id is not None:
            filters.append(UserDevice.user_id == user_id)
        if fingerprint is not None:
            filters.append(UserDevice.fingerprint == fingerprint)
        if device_type is not None:
            filters.append(UserDevice.device_type == device_type)
        if trusted is not None:
            filters.append(UserDevice.trusted.is_(trusted))
        if blocked is not None:
            filters.append(UserDevice.blocked_at.is_not(None) if blocked else UserDevice.blocked_at.is_(None))
        if query:
            needle = f"%{query.strip()}%"
            filters.append(
                or_(
                    UserDevice.fingerprint.ilike(needle),
                    UserDevice.label.ilike(needle),
                    UserDevice.device_brand.ilike(needle),
                    UserDevice.device_model.ilike(needle),
                    UserDevice.last_ip.ilike(needle),
                )
            )

        return await self.cursor_paginate_filtered(
            UserDevice,
            filters,
            "last_seen_at",
            limit,
            starting_after=starting_after,
            ending_before=ending_before,
        )

    async def update(
        self,
        device_id: str,
        *,
        label: str | None = None,
        trusted: bool | None = None,
        blocked: bool | None = None,
        block_reason: str | None = None,
        actor_id: str | None = None,
    ) -> UserDevice | None:
        """Applies the admin-editable fields, stamping who changed trust/blocking.

        Trust and blocking each carry their own actor/timestamp pair, so a device
        that was trusted and later blocked keeps both facts rather than
        overwriting one with the other.
        """
        row = await self.db.get(UserDevice, device_id)
        if row is None:
            return None

        now = now_unix_seconds()
        if label is not None:
            row.label = label
        if trusted is not None:
            row.trusted = trusted
            row.trusted_at = now if trusted else None
            row.trusted_by = actor_id if trusted else None
        if blocked is not None:
            row.blocked_at = now if blocked else None
            row.blocked_by = actor_id if blocked else None
            row.block_reason = block_reason if blocked else None

        row.updated_at = now
        await self.db.flush()
        await self.db.refresh(row)
        return row
