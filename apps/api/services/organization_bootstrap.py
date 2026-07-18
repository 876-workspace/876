from __future__ import annotations

import re
import secrets
import string
from typing import Annotated, Literal

from fastapi import Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import Settings, get_settings
from core.errors import AppHTTPException
from core.id import generate_id, normalize_slug
from core.logging import get_logger
from core.org_permissions import OWNER_ROLE_NAME
from core.timestamps import now_unix_seconds
from db.models import Organization
from db.repositories.memberships import MembershipRepository
from db.repositories.organizations import OrganizationRepository
from db.repositories.users import UserRepository
from db.session import get_db
from providers.protocol import AuthProvider
from providers.workos.adapter import get_auth_provider
from services.provisioning import provision_organization

_SLUG_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]*[a-z0-9]$")
_SLUG_MAX_LENGTH = 64
_SLUG_COLLISION_LIMIT = 50
_RANDOM_SUFFIX_LENGTH = 6
_RANDOM_SUFFIX_ALPHABET = string.ascii_lowercase + string.digits

logger = get_logger(__name__)


class OrganizationBootstrapService:
    """Creates organizations and their owner membership for existing users."""

    def __init__(self, provider: AuthProvider, db: AsyncSession) -> None:
        self._provider = provider
        self._db = db
        self._memberships = MembershipRepository(db)
        self._organizations = OrganizationRepository(db)
        self._users = UserRepository(db)

    async def resolve_registration_slug(self, name: str, slug: str | None) -> str:
        return await self._resolve_slug(name, slug, error_domain="auth")

    async def bootstrap_existing_user(
        self,
        *,
        owner_user_id: str,
        name: str,
        slug: str | None,
    ) -> Organization:
        user = await self._users.get_by_id(owner_user_id)
        if not user:
            raise AppHTTPException(
                code="user/not-found",
                message="No user exists with the provided identifier.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )

        organization_name = name.strip()
        if not organization_name:
            raise AppHTTPException(
                code="organization/validation-failed",
                message="Organization name is required.",
                http_status_code=status.HTTP_400_BAD_REQUEST,
            )
        resolved_slug = await self._resolve_slug(organization_name, slug, error_domain="organization")
        organization_id = generate_id("organization")
        workos_organization_id: str | None = None

        try:
            workos_org = await self._provider.create_organization(
                name=organization_name,
                external_id=organization_id,
                metadata={"slug": resolved_slug, "owner_workos_user_id": user.workos_user_id},
            )
            workos_organization_id = workos_org["id"]
            workos_membership = await self._provider.create_organization_membership(
                user_id=user.workos_user_id,
                organization_id=workos_organization_id,
                role_slug="admin",
            )

            now = now_unix_seconds()
            organization = await self._organizations.create(
                id=organization_id,
                workos_organization_id=workos_organization_id,
                name=organization_name,
                slug=resolved_slug,
                status="active",
                metadata_=workos_org.get("metadata"),
                created_at=now,
                updated_at=now,
            )
            org_roles = await provision_organization(self._db, organization.id, now)
            owner_role = org_roles.get(OWNER_ROLE_NAME)

            await self._memberships.create(
                id=generate_id("membership"),
                organization_id=organization.id,
                user_id=user.id,
                workos_membership_id=workos_membership["id"],
                role=OWNER_ROLE_NAME,
                role_id=owner_role.id if owner_role else None,
                status="active",
                created_at=now,
                updated_at=now,
            )
            return organization
        except Exception:
            if workos_organization_id is not None:
                try:
                    await self._provider.delete_organization(organization_id=workos_organization_id)
                    logger.info(
                        "organization.bootstrap_existing_user.compensated",
                        workos_organization_id=workos_organization_id,
                    )
                except Exception:
                    logger.warning(
                        "organization.bootstrap_existing_user.compensation_failed",
                        workos_organization_id=workos_organization_id,
                        exc_info=True,
                    )
            raise

    async def _resolve_slug(
        self,
        name: str,
        slug: str | None,
        *,
        error_domain: Literal["auth", "organization"],
    ) -> str:
        explicit_slug = slug.strip() if slug else ""
        if not explicit_slug:
            return await self._generate_unique_org_slug(name)

        if not (3 <= len(explicit_slug) <= _SLUG_MAX_LENGTH and _SLUG_PATTERN.fullmatch(explicit_slug)):
            raise AppHTTPException(
                code="auth/invalid-input" if error_domain == "auth" else "organization/validation-failed",
                message="Please check your input." if error_domain == "auth" else "Invalid organization slug.",
                http_status_code=status.HTTP_400_BAD_REQUEST,
            )

        if await self._organizations.get_by_slug(explicit_slug):
            raise AppHTTPException(
                code=(
                    "auth/organization-slug-taken"
                    if error_domain == "auth"
                    else "organization/duplicate-slug"
                ),
                message=(
                    "This organization slug is already taken."
                    if error_domain == "auth"
                    else "An organization with this slug already exists."
                ),
                http_status_code=status.HTTP_409_CONFLICT,
            )
        return explicit_slug

    async def _generate_unique_org_slug(self, name: str) -> str:
        base = normalize_slug(name)[:_SLUG_MAX_LENGTH].rstrip("-")
        if len(base) < 3:
            base = "workspace"

        if not await self._organizations.get_by_slug(base):
            return base

        for index in range(2, _SLUG_COLLISION_LIMIT + 1):
            candidate = self._append_slug_suffix(base, str(index))
            if not await self._organizations.get_by_slug(candidate):
                return candidate

        for _ in range(_SLUG_COLLISION_LIMIT):
            suffix = "".join(secrets.choice(_RANDOM_SUFFIX_ALPHABET) for _ in range(_RANDOM_SUFFIX_LENGTH))
            candidate = self._append_slug_suffix(base, suffix)
            if not await self._organizations.get_by_slug(candidate):
                return candidate

        raise AppHTTPException(
            code="organization/slug-generation-failed",
            message="Could not generate a unique organization slug.",
            http_status_code=status.HTTP_409_CONFLICT,
        )

    @staticmethod
    def _append_slug_suffix(base: str, suffix: str) -> str:
        prefix = base[: _SLUG_MAX_LENGTH - len(suffix) - 1].rstrip("-")
        return f"{prefix}-{suffix}"


def get_organization_bootstrap_service(
    db: Annotated[AsyncSession, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> OrganizationBootstrapService:
    return OrganizationBootstrapService(provider=get_auth_provider(settings), db=db)


OrganizationBootstrapServiceDep = Annotated[
    OrganizationBootstrapService,
    Depends(get_organization_bootstrap_service),
]
