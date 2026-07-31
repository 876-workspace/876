"""Keeps the identity provider (WorkOS) in step with local lifecycle writes.

Every local user/organization/membership row mirrors a WorkOS record. When a
local record is deleted, the WorkOS record must go with it — otherwise the
provider accumulates accounts that can still authenticate but have no local
counterpart, which is exactly the drift Console surfaces as "out of sync".

The helpers here are deliberately **idempotent**: a record that is already gone
at the provider is treated as success, so a retried delete (or a reconciliation
pass) converges instead of failing.

Ordering contract for callers: write locally, flush, then call these. A provider
failure then raises and rolls the local write back, leaving both systems
untouched. The reverse order can delete at WorkOS and keep the local row.
"""

from __future__ import annotations

from core.errors import AppHTTPException
from core.logging import get_logger
from core.org_permissions import OWNER_ROLE_NAME
from providers.protocol import AuthProvider

logger = get_logger(__name__)

# WorkOS reports "already gone" as 404. Deleting a record that no longer exists
# is the outcome the caller wanted, so it is never an error.
_ALREADY_GONE_STATUS = 404

# WorkOS ships `admin` and `member` roles in every environment. Only the owner
# role is mapped explicitly; everything else takes the environment default so a
# custom 876 org role can never fail the call with an unknown slug.
_PROVIDER_ADMIN_ROLE_SLUG = "admin"


async def ensure_provider_membership(
    provider: AuthProvider,
    *,
    workos_organization_id: str | None,
    workos_user_id: str | None,
    role: str,
) -> str | None:
    """Create the WorkOS organization membership mirroring a local one.

    Returns the WorkOS membership id, or None when either side has no provider
    record to link (a local-only org, e.g. one seeded before WorkOS existed).
    Idempotent: an existing provider membership is adopted rather than
    duplicated, so a retry converges instead of raising a conflict.
    """
    if not workos_organization_id or not workos_user_id:
        logger.info(
            "identity_sync.membership.no_provider_record",
            workos_organization_id=workos_organization_id,
            workos_user_id=workos_user_id,
        )
        return None

    role_slug = _PROVIDER_ADMIN_ROLE_SLUG if role == OWNER_ROLE_NAME else None
    try:
        created = await provider.create_organization_membership(
            user_id=workos_user_id,
            organization_id=workos_organization_id,
            role_slug=role_slug,
        )
    except AppHTTPException:
        existing = await _find_provider_membership(
            provider,
            workos_organization_id=workos_organization_id,
            workos_user_id=workos_user_id,
        )
        if existing is None:
            raise
        logger.info(
            "identity_sync.membership.adopted",
            workos_membership_id=existing,
            workos_organization_id=workos_organization_id,
            workos_user_id=workos_user_id,
        )
        return existing

    membership_id = str(created["id"])
    logger.info(
        "identity_sync.membership.created",
        workos_membership_id=membership_id,
        workos_organization_id=workos_organization_id,
        workos_user_id=workos_user_id,
    )
    return membership_id


async def _find_provider_membership(
    provider: AuthProvider,
    *,
    workos_organization_id: str,
    workos_user_id: str,
) -> str | None:
    memberships = await provider.list_organization_memberships(
        organization_id=workos_organization_id,
        user_id=workos_user_id,
    )
    if not memberships:
        return None
    return str(memberships[0]["id"])


async def delete_provider_user(provider: AuthProvider, workos_user_id: str | None, *, local_user_id: str) -> bool:
    """Delete the WorkOS user backing a local account. Returns True if a call landed."""
    if not workos_user_id:
        logger.info("identity_sync.user.no_provider_record", user_id=local_user_id)
        return False

    try:
        await provider.delete_user(user_id=workos_user_id)
    except AppHTTPException as exc:
        if exc.status_code != _ALREADY_GONE_STATUS:
            raise
        logger.info(
            "identity_sync.user.already_absent",
            user_id=local_user_id,
            workos_user_id=workos_user_id,
        )
        return False

    logger.info("identity_sync.user.deleted", user_id=local_user_id, workos_user_id=workos_user_id)
    return True


async def delete_provider_organization(
    provider: AuthProvider,
    workos_organization_id: str | None,
    *,
    local_organization_id: str,
) -> bool:
    """Delete the WorkOS organization backing a local org. Returns True if a call landed."""
    if not workos_organization_id:
        logger.info("identity_sync.organization.no_provider_record", organization_id=local_organization_id)
        return False

    try:
        await provider.delete_organization(organization_id=workos_organization_id)
    except AppHTTPException as exc:
        if exc.status_code != _ALREADY_GONE_STATUS:
            raise
        logger.info(
            "identity_sync.organization.already_absent",
            organization_id=local_organization_id,
            workos_organization_id=workos_organization_id,
        )
        return False

    logger.info(
        "identity_sync.organization.deleted",
        organization_id=local_organization_id,
        workos_organization_id=workos_organization_id,
    )
    return True


async def delete_provider_membership(
    provider: AuthProvider,
    workos_membership_id: str | None,
    *,
    local_membership_id: str,
) -> bool:
    """Delete the WorkOS organization membership backing a local one."""
    if not workos_membership_id:
        logger.info("identity_sync.membership.no_provider_record", membership_id=local_membership_id)
        return False

    try:
        await provider.delete_organization_membership(membership_id=workos_membership_id)
    except AppHTTPException as exc:
        if exc.status_code != _ALREADY_GONE_STATUS:
            raise
        logger.info(
            "identity_sync.membership.already_absent",
            membership_id=local_membership_id,
            workos_membership_id=workos_membership_id,
        )
        return False

    logger.info(
        "identity_sync.membership.deleted",
        membership_id=local_membership_id,
        workos_membership_id=workos_membership_id,
    )
    return True


async def compensate_provider_user(provider: AuthProvider, workos_user_id: str, *, operation: str) -> None:
    """Best-effort rollback of a WorkOS user created earlier in a failed request.

    Never raises: it runs inside an `except` block that is about to re-raise the
    original failure, and masking that with a compensation error would hide the
    real cause. A compensation that fails leaves an orphan for the reconciler.
    """
    try:
        await provider.delete_user(user_id=workos_user_id)
        logger.info("identity_sync.compensated", resource="user", operation=operation, workos_user_id=workos_user_id)
    except Exception:
        logger.warning(
            "identity_sync.compensation_failed",
            resource="user",
            operation=operation,
            workos_user_id=workos_user_id,
            exc_info=True,
        )
