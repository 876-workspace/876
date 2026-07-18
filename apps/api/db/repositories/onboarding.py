from typing import Literal

from pydantic import JsonValue
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.id import generate_id
from db.models import OnboardingAnswer, OnboardingSession

OnboardingTargetType = Literal["organization", "application"]


class OnboardingRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def retrieve(
        self,
        organization_id: str,
        target_type: OnboardingTargetType,
        target_key: str,
        *,
        country_code: str,
        schema_version: int,
        catalog_revision: int,
    ) -> OnboardingSession | None:
        session: OnboardingSession | None = await self.db.scalar(
            select(OnboardingSession)
            .where(
                OnboardingSession.organization_id == organization_id,
                OnboardingSession.target_type == target_type,
                OnboardingSession.target_key == target_key,
                OnboardingSession.country_code == country_code,
                OnboardingSession.schema_version == schema_version,
                OnboardingSession.catalog_revision == catalog_revision,
            )
            .options(selectinload(OnboardingSession.answers))
        )
        return session

    async def get_or_create(
        self,
        organization_id: str,
        target_type: OnboardingTargetType,
        target_key: str,
        *,
        country_code: str,
        catalog_revision: int,
        now: int,
    ) -> OnboardingSession:
        existing = await self.retrieve(
            organization_id,
            target_type,
            target_key,
            country_code=country_code,
            schema_version=1,
            catalog_revision=catalog_revision,
        )
        if existing is not None:
            return existing
        await self.db.execute(
            insert(OnboardingSession)
            .values(
                id=generate_id("onboardingSession"),
                organization_id=organization_id,
                target_type=target_type,
                target_key=target_key,
                country_code=country_code,
                schema_version=1,
                catalog_revision=catalog_revision,
                status="draft",
                created_at=now,
                updated_at=now,
            )
            .on_conflict_do_nothing(
                index_elements=[
                    "organization_id",
                    "target_type",
                    "target_key",
                    "country_code",
                    "schema_version",
                    "catalog_revision",
                ]
            )
        )
        session = await self.retrieve(
            organization_id,
            target_type,
            target_key,
            country_code=country_code,
            schema_version=1,
            catalog_revision=catalog_revision,
        )
        assert session is not None
        return session

    async def retrieve_for_update(
        self,
        organization_id: str,
        target_type: OnboardingTargetType,
        target_key: str,
        *,
        country_code: str,
        schema_version: int,
        catalog_revision: int,
    ) -> OnboardingSession | None:
        session: OnboardingSession | None = await self.db.scalar(
            select(OnboardingSession)
            .where(
                OnboardingSession.organization_id == organization_id,
                OnboardingSession.target_type == target_type,
                OnboardingSession.target_key == target_key,
                OnboardingSession.country_code == country_code,
                OnboardingSession.schema_version == schema_version,
                OnboardingSession.catalog_revision == catalog_revision,
            )
            .options(selectinload(OnboardingSession.answers))
            .with_for_update()
        )
        return session

    async def retrieve_existing_for_update(
        self,
        organization_id: str,
        target_type: OnboardingTargetType,
        target_key: str,
        *,
        country_code: str,
        schema_version: int,
    ) -> OnboardingSession | None:
        session: OnboardingSession | None = await self.db.scalar(
            select(OnboardingSession)
            .where(
                OnboardingSession.organization_id == organization_id,
                OnboardingSession.target_type == target_type,
                OnboardingSession.target_key == target_key,
                OnboardingSession.country_code == country_code,
                OnboardingSession.schema_version == schema_version,
            )
            .options(selectinload(OnboardingSession.answers))
            .order_by(OnboardingSession.catalog_revision.desc())
            .with_for_update()
        )
        return session

    async def replace_answers(
        self,
        session: OnboardingSession,
        answers: dict[str, JsonValue],
        *,
        country_code: str,
        now: int,
    ) -> OnboardingSession:
        locked = await self.db.scalar(
            select(OnboardingSession).where(OnboardingSession.id == session.id).with_for_update()
        )
        assert locked is not None
        await self.db.execute(delete(OnboardingAnswer).where(OnboardingAnswer.session_id == locked.id))
        for field_key, value in answers.items():
            self.db.add(
                OnboardingAnswer(
                    id=generate_id("onboardingAnswer"),
                    session_id=locked.id,
                    field_key=field_key,
                    value=value,
                    created_at=now,
                    updated_at=now,
                )
            )
        locked.country_code = country_code
        locked.status = "needs_update" if locked.submitted_at is not None else "draft"
        locked.completed_at = None
        locked.updated_at = now
        await self.db.flush()
        refreshed = await self.retrieve(
            locked.organization_id,
            locked.target_type,
            locked.target_key,
            country_code=country_code,
            schema_version=locked.schema_version,
            catalog_revision=locked.catalog_revision,
        )
        assert refreshed is not None
        return refreshed

    async def submit(self, session: OnboardingSession, *, now: int) -> OnboardingSession:
        session.status = "submitted"
        session.submitted_at = now
        session.updated_at = now
        await self.db.flush()
        refreshed = await self.retrieve(
            session.organization_id,
            session.target_type,
            session.target_key,
            country_code=session.country_code,
            schema_version=session.schema_version,
            catalog_revision=session.catalog_revision,
        )
        assert refreshed is not None
        return refreshed
