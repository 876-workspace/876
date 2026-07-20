from typing import Annotated, Any

from fastapi import APIRouter, Depends, Path, Query, status
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from core.config import get_settings
from core.errors import AppHTTPException
from core.id import generate_id, generate_platform_owner_user_id
from core.identifications import (
    IDENTIFICATION_TYPES,
    is_valid_identification_value,
    mask_identification_value,
    normalize_identification_value,
)
from core.logging import get_logger
from core.responses import ListObject
from core.security import AdminDep, SessionDep
from core.timestamps import now_unix_seconds
from db.models import Feature, Membership, OauthGrant, User, UserFeature, UserProfile
from db.repositories.addresses import AddressRepository
from db.repositories.audit_events import AuditEventRepository
from db.repositories.memberships import MembershipRepository
from db.repositories.reserved_usernames import ReservedUsernameRepository
from db.repositories.sessions import SessionRepository
from db.repositories.subscriptions import SubscriptionRepository
from db.repositories.user_accounts import UserAccountRepository
from db.repositories.user_app_enrollments import UserAppEnrollmentRepository
from db.repositories.user_contacts import UserContactRepository
from db.repositories.user_features import UserFeatureRepository
from db.repositories.user_identifications import UserIdentificationRepository
from db.repositories.users import UserRepository
from db.session import get_db
from domains.addresses.schemas import AddressDeleteResponse, AddressResponse
from domains.auth.schemas import RoutingMembership, RoutingOrganization
from domains.features.schemas import GrantFeatureRequest, UserFeatureResponse
from domains.users.schemas import (
    AccountResponse,
    AuthorizedAppResponse,
    ConsumerAddressCreate,
    ConsumerAddressUpdate,
    ConsumerContactCreate,
    ConsumerContactDeleteResponse,
    ConsumerContactResponse,
    ConsumerContactUpdate,
    ConsumerContactUserResponse,
    ConsumerProfileDeleteResponse,
    ConsumerProfileResponse,
    ConsumerProfileUpdate,
    EnsuredUserResponse,
    ReservedUsernameCreate,
    ReservedUsernameDeleteResponse,
    ReservedUsernameResponse,
    UserAccountUnlinkResponse,
    UserAppResponse,
    UserBackfillUsernamesResponse,
    UserBanRequest,
    UserCreate,
    UserDeleteResponse,
    UserEnsureRequest,
    UserIdentificationCreate,
    UserIdentificationDeleteResponse,
    UserIdentificationDiscloseRequest,
    UserIdentificationDisclosureResponse,
    UserIdentificationResponse,
    UserIdentificationUpdate,
    UserIdentificationVerifyRequest,
    UsernameAvailabilityResponse,
    UserOAuthGrantRevokeResponse,
    UserResponse,
    UserSessionRevokeResponse,
    UserUpdate,
)
from providers.workos.client import get_workos_client
from services.billing_customer_sync import enqueue_customer_ensure_for_user
from services.features import FeatureService
from services.provisioning import resolve_member_permissions

from . import docs  # noqa: F401
from .username import assert_username_available, evaluate_username
from .username import normalize_username as _normalize_username

logger = get_logger(__name__)
router = APIRouter(prefix="/users", tags=["Users"])

async def _unique_username(
    db: AsyncSession,
    base: str,
    reserved: set[str],
    *,
    reserved_names: set[str] | None = None,
) -> str:
    candidate = base[:32]
    index = 2
    repo = UserRepository(db)
    # When the caller pre-loads the reserved list (e.g. backfill iterating many
    # users), check it in memory to avoid an `is_reserved` query per candidate;
    # otherwise fall back to a per-candidate lookup for one-off callers.
    reserved_repo = ReservedUsernameRepository(db) if reserved_names is None else None

    async def _is_reserved(name: str) -> bool:
        if reserved_names is not None:
            return name in reserved_names
        assert reserved_repo is not None
        return await reserved_repo.is_reserved(name)

    # Skip names that are already in this batch, on the reserved list, or held by
    # any user (including soft-deleted rows, which still occupy the unique index).
    while (
        candidate in reserved
        or await _is_reserved(candidate)
        or await repo.get_by_username(candidate, include_deleted=True)
    ):
        suffix = f"-{index}"
        candidate = f"{base[: 32 - len(suffix)]}{suffix}"
        index += 1

    reserved.add(candidate)
    return candidate


def _serialize_user(
    row: Any,
    company: str | None = None,
    company_short_name: str | None = None,
    company_logo: str | None = None,
) -> UserResponse:
    return UserResponse(
        id=row.id,
        company=company,
        company_short_name=company_short_name,
        company_logo=company_logo,
        workos_user_id=row.workos_user_id,
        stripe_customer_id=row.stripe_customer_id,
        email=row.email,
        username=row.username,
        email_verified=row.email_verified,
        first_name=row.first_name,
        last_name=row.last_name,
        deleted_at=row.deleted_at,
        deleted_by=row.deleted_by,
        deletion_reason=row.deletion_reason,
        middle_name=row.middle_name,
        avatar=row.avatar,
        platform_role=getattr(row, "platform_role", None),
        status=row.status,
        banned=row.banned,
        banned_reason=row.banned_reason,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _serialize_ensured_user(row: Any) -> EnsuredUserResponse:
    """Serialize a user for the app-key `/ensure` tier — no WorkOS/admin fields."""
    return EnsuredUserResponse(
        id=row.id,
        stripe_customer_id=row.stripe_customer_id,
        email=row.email,
        username=row.username,
        email_verified=row.email_verified,
        first_name=row.first_name,
        last_name=row.last_name,
        middle_name=row.middle_name,
        avatar=row.avatar,
        status=row.status,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _serialize_address(row: Any) -> AddressResponse:
    return AddressResponse.model_validate(row)


def _serialize_account(row: Any) -> AccountResponse:
    return AccountResponse(
        id=row.id,
        provider_id=row.provider_id,
        provider_type=row.provider_type,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _serialize_consumer_profile(user: User, profile: UserProfile) -> ConsumerProfileResponse:
    return ConsumerProfileResponse(
        id=profile.id,
        user_id=user.id,
        email=user.email,
        username=user.username,
        first_name=user.first_name,
        last_name=user.last_name,
        middle_name=user.middle_name,
        nickname=profile.nickname,
        avatar=user.avatar,
        gender=profile.gender,  # type: ignore[arg-type]
        phone_number=profile.phone_number or user.phone,
        date_of_birth=profile.date_of_birth,
        language=profile.language,
        timezone=profile.timezone,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


def _serialize_contact_user(user: User) -> ConsumerContactUserResponse:
    return ConsumerContactUserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        first_name=user.first_name,
        last_name=user.last_name,
        middle_name=user.middle_name,
        avatar=user.avatar,
    )


def _serialize_consumer_contact(row: Any) -> ConsumerContactResponse:
    return ConsumerContactResponse(
        id=row.id,
        owner_user_id=row.owner_user_id,
        contact_user_id=row.contact_user_id,
        contact_user=_serialize_contact_user(row.contact_user),
        nickname=row.nickname,
        notes=row.notes,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _serialize_user_identification(row: Any) -> UserIdentificationResponse:
    config = IDENTIFICATION_TYPES.get(row.type)
    return UserIdentificationResponse(
        id=row.id,
        user_id=row.user_id,
        type=row.type,
        label=config.label if config else row.type,
        country_code=row.country_code,
        value_masked=mask_identification_value(row.value),
        verified=row.verified,
        verified_at=row.verified_at,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


async def _require_user(db: AsyncSession, user_id: str) -> User:
    user = await UserRepository(db).get_by_id(user_id)
    if not user:
        raise AppHTTPException(
            code="user/not-found",
            message="No user exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return user


async def _require_session_user_id(principal: SessionDep) -> str:
    if principal.user_id:
        return principal.user_id
    raise AppHTTPException(
        code="auth/no-session",
        message="No active session.",
        http_status_code=status.HTTP_401_UNAUTHORIZED,
    )


async def _get_profile(db: AsyncSession, user_id: str) -> UserProfile | None:
    stmt = select(UserProfile).where(UserProfile.user_id == user_id)
    return (await db.scalars(stmt)).first()


async def _ensure_profile(db: AsyncSession, user_id: str) -> UserProfile:
    profile = await _get_profile(db, user_id)
    if profile:
        return profile
    now = now_unix_seconds()
    profile = UserProfile(
        id=generate_id("userProfile"),
        user_id=user_id,
        created_at=now,
        updated_at=now,
    )
    db.add(profile)
    await db.flush()
    return profile


async def _require_profile(db: AsyncSession, user_id: str) -> UserProfile:
    profile = await _get_profile(db, user_id)
    if not profile:
        raise AppHTTPException(
            code="profile/not-found",
            message="No profile exists for the provided user.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return profile


async def _update_consumer_profile(
    db: AsyncSession,
    user: User,
    profile: UserProfile,
    body: ConsumerProfileUpdate,
) -> ConsumerProfileResponse:
    updates = body.model_dump(exclude_unset=True)
    now = now_unix_seconds()
    user_updates: dict[str, Any] = {}
    profile_updates: dict[str, Any] = {}

    for field in ("first_name", "last_name", "middle_name", "avatar"):
        if field in updates:
            user_updates[field] = updates[field]

    for field in ("nickname", "gender", "phone_number", "date_of_birth", "language", "timezone"):
        if field in updates:
            profile_updates[field] = updates[field]

    if user_updates:
        user_updates["updated_at"] = now
        updated_user = await UserRepository(db).update(user.id, **user_updates)
        if updated_user:
            user = updated_user

    if profile_updates:
        profile_updates["updated_at"] = now
        stmt = update(UserProfile).where(UserProfile.id == profile.id).values(**profile_updates).returning(UserProfile)
        updated_profile = (await db.scalars(stmt)).first()
        if updated_profile:
            profile = updated_profile

    return _serialize_consumer_profile(user, profile)


def _validate_non_empty_update(updates: dict[str, Any]) -> None:
    if updates:
        return
    raise AppHTTPException(
        code="provider/invalid-request",
        message="No fields to update.",
        http_status_code=status.HTTP_400_BAD_REQUEST,
    )


async def _create_user_contact(
    db: AsyncSession,
    owner_user_id: str,
    body: ConsumerContactCreate,
) -> ConsumerContactResponse:
    await _require_user(db, owner_user_id)
    contact_user = await _require_user(db, body.contact_user_id)
    if owner_user_id == body.contact_user_id:
        raise AppHTTPException(
            code="contact/self-contact",
            message="A user cannot save themself as a contact.",
            http_status_code=status.HTTP_400_BAD_REQUEST,
        )

    repo = UserContactRepository(db)
    existing = await repo.get_by_pair(owner_user_id, body.contact_user_id)
    if existing:
        raise AppHTTPException(
            code="contact/already-exists",
            message="This user is already saved as a contact.",
            http_status_code=status.HTTP_409_CONFLICT,
        )

    now = now_unix_seconds()
    contact = await repo.create(
        id=generate_id("contact"),
        owner_user_id=owner_user_id,
        contact_user_id=contact_user.id,
        nickname=body.nickname,
        notes=body.notes,
        created_at=now,
        updated_at=now,
    )
    contact.contact_user = contact_user
    return _serialize_consumer_contact(contact)


async def _update_user_contact(
    db: AsyncSession,
    owner_user_id: str,
    contact_id: str,
    body: ConsumerContactUpdate,
) -> ConsumerContactResponse:
    updates = body.model_dump(exclude_unset=True)
    _validate_non_empty_update(updates)
    updates["updated_at"] = now_unix_seconds()

    repo = UserContactRepository(db)
    updated = await repo.update_for_owner(contact_id, owner_user_id, **updates)
    if not updated:
        raise AppHTTPException(
            code="contact/not-found",
            message="Contact not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )

    loaded = await repo.get_by_id_for_owner(contact_id, owner_user_id)
    if not loaded:
        raise AppHTTPException(
            code="contact/not-found",
            message="Contact not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return _serialize_consumer_contact(loaded)


async def _delete_user_contact(
    db: AsyncSession,
    owner_user_id: str,
    contact_id: str,
) -> ConsumerContactDeleteResponse:
    deleted = await UserContactRepository(db).delete_for_owner(contact_id, owner_user_id)
    if not deleted:
        raise AppHTTPException(
            code="contact/not-found",
            message="Contact not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return ConsumerContactDeleteResponse(id=contact_id)


def _serialize_user_feature(row: Any) -> UserFeatureResponse:
    return UserFeatureResponse(
        id=row.id,
        user_id=row.user_id,
        feature_id=row.feature_id,
        slug=row.feature.slug,
        status=row.status,
        note=row.note,
        synced_at=row.synced_at,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


async def _load_user_feature_target(db: AsyncSession, user_id: str, feature_id: str) -> tuple[User, Feature]:
    user = await UserRepository(db).get_by_id(user_id)
    if not user:
        raise AppHTTPException(
            code="feature/user-not-found",
            message="No user exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )

    feature = await db.get(Feature, feature_id)
    if not feature:
        raise AppHTTPException(
            code="feature/not-found",
            message="No feature exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )

    return user, feature


def _enforce_user_feature_grant_scope(user: User, feature: Feature) -> None:
    if feature.scope == "enterprise":
        raise AppHTTPException(
            code="feature/scope-mismatch",
            message="This feature cannot be granted to the specified target type.",
            http_status_code=status.HTTP_400_BAD_REQUEST,
        )
    # All users are consumer-capable; consumer-scoped features are grantable to anyone.
    # Enterprise-scoped features require at least one active org membership (enforced at the endpoint level).


async def _sync_workos_user_feature(feature: Feature, user: User, *, enabled: bool) -> None:
    workos_client = get_workos_client(get_settings())

    try:
        if enabled:
            await workos_client.add_feature_flag_target(feature.slug, user.workos_user_id)
        else:
            await workos_client.remove_feature_flag_target(feature.slug, user.workos_user_id)
    except Exception as exc:
        logger.error(
            "workos.feature_target_sync failed",
            feature_slug=feature.slug,
            user_id=user.id,
            enabled=enabled,
            exc_info=True,
        )
        raise AppHTTPException(
            code="feature/workos-error",
            message="WorkOS could not complete the feature operation.",
            http_status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        ) from exc


async def _set_user_feature_status(
    db: AsyncSession,
    *,
    user_id: str,
    feature: Feature,
    status_value: str,
    note: str | None,
    update_note: bool,
) -> UserFeatureResponse:
    repo = UserFeatureRepository(db)
    existing = await repo.get_by_user_and_feature(user_id, feature.id)
    now = now_unix_seconds()

    if existing:
        existing.status = status_value
        if update_note:
            existing.note = note
        existing.synced_at = now
        existing.updated_at = now
        row = existing
    else:
        row = UserFeature(
            id=generate_id("userFeature"),
            user_id=user_id,
            feature_id=feature.id,
            status=status_value,
            note=note,
            synced_at=now,
            created_at=now,
            updated_at=now,
        )
        db.add(row)

    await db.flush()

    # The caller already loaded the feature; attach it for serialization instead
    # of re-fetching the row with a joinedload.
    row.feature = feature
    return _serialize_user_feature(row)


@router.get(
    "/me/profile",
    response_model=ConsumerProfileResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.RETRIEVE_MY_PROFILE_SUMMARY,
    description=docs.RETRIEVE_MY_PROFILE_DESCRIPTION,
    responses=docs.RETRIEVE_MY_PROFILE_RESPONSES,
)
async def retrieve_my_profile(
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ConsumerProfileResponse:
    user_id = await _require_session_user_id(principal)
    user = await _require_user(db, user_id)
    profile = await _ensure_profile(db, user_id)
    return _serialize_consumer_profile(user, profile)


@router.patch(
    "/me/profile",
    response_model=ConsumerProfileResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.UPDATE_MY_PROFILE_SUMMARY,
    description=docs.UPDATE_MY_PROFILE_DESCRIPTION,
    responses=docs.UPDATE_MY_PROFILE_RESPONSES,
)
async def update_my_profile(
    body: ConsumerProfileUpdate,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ConsumerProfileResponse:
    user_id = await _require_session_user_id(principal)
    user = await _require_user(db, user_id)
    profile = await _ensure_profile(db, user_id)
    return await _update_consumer_profile(db, user, profile, body)


@router.get(
    "/me/addresses",
    response_model=ListObject[AddressResponse],
    status_code=status.HTTP_200_OK,
    summary=docs.LIST_MY_ADDRESSES_SUMMARY,
    description=docs.LIST_MY_ADDRESSES_DESCRIPTION,
    responses=docs.LIST_MY_ADDRESSES_RESPONSES,
)
async def list_my_addresses(
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ListObject[AddressResponse]:
    user_id = await _require_session_user_id(principal)
    rows = await AddressRepository(db).list_by_user(user_id)
    return ListObject[AddressResponse](
        data=[_serialize_address(row) for row in rows],
        has_more=False,
        url="/users/me/addresses",
    )


@router.post(
    "/me/addresses",
    response_model=AddressResponse,
    status_code=status.HTTP_201_CREATED,
    summary=docs.CREATE_MY_ADDRESS_SUMMARY,
    description=docs.CREATE_MY_ADDRESS_DESCRIPTION,
    responses=docs.CREATE_MY_ADDRESS_RESPONSES,
)
async def create_my_address(
    body: ConsumerAddressCreate,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AddressResponse:
    user_id = await _require_session_user_id(principal)
    await _require_user(db, user_id)
    now = now_unix_seconds()
    address = await AddressRepository(db).create(
        id=generate_id("address"),
        user_id=user_id,
        organization_id=None,
        type=body.type,
        label=body.label,
        line1=body.line1,
        line2=body.line2,
        city=body.city,
        region_id=body.region_id,
        country_code=body.country_code,
        postal_code=body.postal_code,
        is_default=body.is_default,
        created_at=now,
        updated_at=now,
    )
    return _serialize_address(address)


@router.get(
    "/me/addresses/{address_id}",
    response_model=AddressResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.RETRIEVE_MY_ADDRESS_SUMMARY,
    description=docs.RETRIEVE_MY_ADDRESS_DESCRIPTION,
    responses=docs.RETRIEVE_MY_ADDRESS_RESPONSES,
)
async def retrieve_my_address(
    address_id: str,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AddressResponse:
    user_id = await _require_session_user_id(principal)
    address = await AddressRepository(db).get_by_id_for_user(address_id, user_id)
    if not address:
        raise AppHTTPException(
            code="address/not-found",
            message="Address not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return _serialize_address(address)


@router.patch(
    "/me/addresses/{address_id}",
    response_model=AddressResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.UPDATE_MY_ADDRESS_SUMMARY,
    description=docs.UPDATE_MY_ADDRESS_DESCRIPTION,
    responses=docs.UPDATE_MY_ADDRESS_RESPONSES,
)
async def update_my_address(
    address_id: str,
    body: ConsumerAddressUpdate,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AddressResponse:
    user_id = await _require_session_user_id(principal)
    updates = body.model_dump(exclude_unset=True)
    _validate_non_empty_update(updates)
    updates["updated_at"] = now_unix_seconds()
    address = await AddressRepository(db).update_for_user(address_id, user_id, **updates)
    if not address:
        raise AppHTTPException(
            code="address/not-found",
            message="Address not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return _serialize_address(address)


@router.delete(
    "/me/addresses/{address_id}",
    response_model=AddressDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.DELETE_MY_ADDRESS_SUMMARY,
    description=docs.DELETE_MY_ADDRESS_DESCRIPTION,
    responses=docs.DELETE_MY_ADDRESS_RESPONSES,
)
async def delete_my_address(
    address_id: str,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AddressDeleteResponse:
    user_id = await _require_session_user_id(principal)
    deleted = await AddressRepository(db).delete_for_user(address_id, user_id)
    if not deleted:
        raise AppHTTPException(
            code="address/not-found",
            message="Address not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return AddressDeleteResponse(id=address_id)


@router.get(
    "/me/contacts",
    response_model=ListObject[ConsumerContactResponse],
    status_code=status.HTTP_200_OK,
    summary=docs.LIST_MY_CONTACTS_SUMMARY,
    description=docs.LIST_MY_CONTACTS_DESCRIPTION,
    responses=docs.LIST_MY_CONTACTS_RESPONSES,
)
async def list_my_contacts(
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ListObject[ConsumerContactResponse]:
    user_id = await _require_session_user_id(principal)
    rows = await UserContactRepository(db).list_by_owner(user_id)
    return ListObject[ConsumerContactResponse](
        data=[_serialize_consumer_contact(row) for row in rows],
        has_more=False,
        url="/users/me/contacts",
    )


@router.post(
    "/me/contacts",
    response_model=ConsumerContactResponse,
    status_code=status.HTTP_201_CREATED,
    summary=docs.CREATE_MY_CONTACT_SUMMARY,
    description=docs.CREATE_MY_CONTACT_DESCRIPTION,
    responses=docs.CREATE_MY_CONTACT_RESPONSES,
)
async def create_my_contact(
    body: ConsumerContactCreate,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ConsumerContactResponse:
    user_id = await _require_session_user_id(principal)
    return await _create_user_contact(db, user_id, body)


@router.get(
    "/me/contacts/{contact_id}",
    response_model=ConsumerContactResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.RETRIEVE_MY_CONTACT_SUMMARY,
    description=docs.RETRIEVE_MY_CONTACT_DESCRIPTION,
    responses=docs.RETRIEVE_MY_CONTACT_RESPONSES,
)
async def retrieve_my_contact(
    contact_id: str,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ConsumerContactResponse:
    user_id = await _require_session_user_id(principal)
    contact = await UserContactRepository(db).get_by_id_for_owner(contact_id, user_id)
    if not contact:
        raise AppHTTPException(
            code="contact/not-found",
            message="Contact not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return _serialize_consumer_contact(contact)


@router.patch(
    "/me/contacts/{contact_id}",
    response_model=ConsumerContactResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.UPDATE_MY_CONTACT_SUMMARY,
    description=docs.UPDATE_MY_CONTACT_DESCRIPTION,
    responses=docs.UPDATE_MY_CONTACT_RESPONSES,
)
async def update_my_contact(
    contact_id: str,
    body: ConsumerContactUpdate,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ConsumerContactResponse:
    user_id = await _require_session_user_id(principal)
    return await _update_user_contact(db, user_id, contact_id, body)


@router.delete(
    "/me/contacts/{contact_id}",
    response_model=ConsumerContactDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.DELETE_MY_CONTACT_SUMMARY,
    description=docs.DELETE_MY_CONTACT_DESCRIPTION,
    responses=docs.DELETE_MY_CONTACT_RESPONSES,
)
async def delete_my_contact(
    contact_id: str,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ConsumerContactDeleteResponse:
    user_id = await _require_session_user_id(principal)
    return await _delete_user_contact(db, user_id, contact_id)


@router.get(
    "/me/memberships",
    response_model=ListObject[RoutingMembership],
    status_code=status.HTTP_200_OK,
    summary=docs.LIST_MY_MEMBERSHIPS_SUMMARY,
    description=docs.LIST_MY_MEMBERSHIPS_DESCRIPTION,
    responses=docs.LIST_MY_MEMBERSHIPS_RESPONSES,
)
async def list_my_memberships(
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    membership_status: Annotated[
        str | None,
        Query(alias="status", description="Filter results to memberships with this status.", examples=["active"]),
    ] = None,
) -> ListObject[RoutingMembership]:
    user_id = await _require_session_user_id(principal)

    filters = [Membership.user_id == user_id]
    if membership_status:
        filters.append(Membership.status == membership_status.strip())

    stmt = (
        select(Membership)
        .options(joinedload(Membership.organization))
        .where(*filters)
        .order_by(Membership.created_at.desc())
    )
    rows = (await db.scalars(stmt)).unique().all()

    return ListObject[RoutingMembership](
        data=[
            RoutingMembership(
                id=m.id,
                role=m.role,
                status=m.status,
                permissions=sorted(await resolve_member_permissions(db, m)),
                organization=RoutingOrganization(
                    id=m.organization.id,
                    name=m.organization.name,
                    slug=m.organization.slug,
                    status=m.organization.status,
                ),
            )
            for m in rows
        ],
        has_more=False,
        url="/users/me/memberships",
    )


@router.post(
    "/{user_id}/profile",
    response_model=ConsumerProfileResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_user_profile(
    user_id: str,
    body: ConsumerProfileUpdate,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ConsumerProfileResponse:
    user = await _require_user(db, user_id)
    existing = await _get_profile(db, user_id)
    if existing:
        raise AppHTTPException(
            code="profile/already-exists",
            message="A profile already exists for this user.",
            http_status_code=status.HTTP_409_CONFLICT,
        )
    now = now_unix_seconds()
    profile = UserProfile(id=generate_id("userProfile"), user_id=user_id, created_at=now, updated_at=now)
    db.add(profile)
    await db.flush()
    return await _update_consumer_profile(db, user, profile, body)


@router.get(
    "/{user_id}/profile",
    response_model=ConsumerProfileResponse,
    status_code=status.HTTP_200_OK,
)
async def retrieve_user_profile(
    user_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ConsumerProfileResponse:
    user = await _require_user(db, user_id)
    profile = await _require_profile(db, user_id)
    return _serialize_consumer_profile(user, profile)


@router.patch(
    "/{user_id}/profile",
    response_model=ConsumerProfileResponse,
    status_code=status.HTTP_200_OK,
)
async def update_user_profile(
    user_id: str,
    body: ConsumerProfileUpdate,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ConsumerProfileResponse:
    user = await _require_user(db, user_id)
    profile = await _ensure_profile(db, user_id)
    return await _update_consumer_profile(db, user, profile, body)


@router.delete(
    "/{user_id}/profile",
    response_model=ConsumerProfileDeleteResponse,
    status_code=status.HTTP_200_OK,
)
async def delete_user_profile(
    user_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ConsumerProfileDeleteResponse:
    profile = await _require_profile(db, user_id)
    await db.execute(delete(UserProfile).where(UserProfile.id == profile.id))
    return ConsumerProfileDeleteResponse(id=profile.id)


@router.get(
    "/{user_id}/addresses",
    response_model=ListObject[AddressResponse],
    status_code=status.HTTP_200_OK,
)
async def list_user_addresses(
    user_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ListObject[AddressResponse]:
    await _require_user(db, user_id)
    rows = await AddressRepository(db).list_by_user(user_id)
    return ListObject[AddressResponse](
        data=[_serialize_address(row) for row in rows],
        has_more=False,
        url=f"/users/{user_id}/addresses",
    )


@router.post(
    "/{user_id}/addresses",
    response_model=AddressResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_user_address(
    user_id: str,
    body: ConsumerAddressCreate,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AddressResponse:
    await _require_user(db, user_id)
    now = now_unix_seconds()
    address = await AddressRepository(db).create(
        id=generate_id("address"),
        user_id=user_id,
        organization_id=None,
        type=body.type,
        label=body.label,
        line1=body.line1,
        line2=body.line2,
        city=body.city,
        region_id=body.region_id,
        country_code=body.country_code,
        postal_code=body.postal_code,
        is_default=body.is_default,
        created_at=now,
        updated_at=now,
    )
    return _serialize_address(address)


@router.get(
    "/{user_id}/addresses/{address_id}",
    response_model=AddressResponse,
    status_code=status.HTTP_200_OK,
)
async def retrieve_user_address(
    user_id: str,
    address_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AddressResponse:
    address = await AddressRepository(db).get_by_id_for_user(address_id, user_id)
    if not address:
        raise AppHTTPException(
            code="address/not-found",
            message="Address not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return _serialize_address(address)


@router.patch(
    "/{user_id}/addresses/{address_id}",
    response_model=AddressResponse,
    status_code=status.HTTP_200_OK,
)
async def update_user_address(
    user_id: str,
    address_id: str,
    body: ConsumerAddressUpdate,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AddressResponse:
    updates = body.model_dump(exclude_unset=True)
    _validate_non_empty_update(updates)
    updates["updated_at"] = now_unix_seconds()
    address = await AddressRepository(db).update_for_user(address_id, user_id, **updates)
    if not address:
        raise AppHTTPException(
            code="address/not-found",
            message="Address not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return _serialize_address(address)


@router.delete(
    "/{user_id}/addresses/{address_id}",
    response_model=AddressDeleteResponse,
    status_code=status.HTTP_200_OK,
)
async def delete_user_address(
    user_id: str,
    address_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AddressDeleteResponse:
    deleted = await AddressRepository(db).delete_for_user(address_id, user_id)
    if not deleted:
        raise AppHTTPException(
            code="address/not-found",
            message="Address not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return AddressDeleteResponse(id=address_id)


@router.get(
    "/{user_id}/accounts",
    response_model=ListObject[AccountResponse],
    status_code=status.HTTP_200_OK,
    summary=docs.LIST_USER_ACCOUNTS_SUMMARY,
    description=docs.LIST_USER_ACCOUNTS_DESCRIPTION,
    responses=docs.LIST_USER_ACCOUNTS_RESPONSES,
)
async def list_user_accounts(
    user_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ListObject[AccountResponse]:
    await _require_user(db, user_id)
    rows = await UserAccountRepository(db).list_for_user(user_id)
    return ListObject[AccountResponse](
        data=[_serialize_account(row) for row in rows],
        has_more=False,
        url=f"/users/{user_id}/accounts",
        total_count=len(rows),
    )


@router.get(
    "/{user_id}/contacts",
    response_model=ListObject[ConsumerContactResponse],
    status_code=status.HTTP_200_OK,
)
async def list_user_contacts(
    user_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ListObject[ConsumerContactResponse]:
    await _require_user(db, user_id)
    rows = await UserContactRepository(db).list_by_owner(user_id)
    return ListObject[ConsumerContactResponse](
        data=[_serialize_consumer_contact(row) for row in rows],
        has_more=False,
        url=f"/users/{user_id}/contacts",
    )


@router.post(
    "/{user_id}/contacts",
    response_model=ConsumerContactResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_user_contact(
    user_id: str,
    body: ConsumerContactCreate,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ConsumerContactResponse:
    return await _create_user_contact(db, user_id, body)


@router.get(
    "/{user_id}/contacts/{contact_id}",
    response_model=ConsumerContactResponse,
    status_code=status.HTTP_200_OK,
)
async def retrieve_user_contact(
    user_id: str,
    contact_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ConsumerContactResponse:
    contact = await UserContactRepository(db).get_by_id_for_owner(contact_id, user_id)
    if not contact:
        raise AppHTTPException(
            code="contact/not-found",
            message="Contact not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return _serialize_consumer_contact(contact)


@router.patch(
    "/{user_id}/contacts/{contact_id}",
    response_model=ConsumerContactResponse,
    status_code=status.HTTP_200_OK,
)
async def update_user_contact(
    user_id: str,
    contact_id: str,
    body: ConsumerContactUpdate,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ConsumerContactResponse:
    return await _update_user_contact(db, user_id, contact_id, body)


@router.delete(
    "/{user_id}/contacts/{contact_id}",
    response_model=ConsumerContactDeleteResponse,
    status_code=status.HTTP_200_OK,
)
async def delete_user_contact(
    user_id: str,
    contact_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ConsumerContactDeleteResponse:
    return await _delete_user_contact(db, user_id, contact_id)


@router.get(
    "/by-username/{username}",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.GET_BY_USERNAME_SUMMARY,
    description=docs.GET_BY_USERNAME_DESCRIPTION,
    responses=docs.GET_BY_USERNAME_RESPONSES,
)
async def get_user_by_username(
    username: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    include_deleted: bool = False,
) -> UserResponse:
    user = await UserRepository(db).get_by_username(username, include_deleted=include_deleted)
    if not user:
        raise AppHTTPException(
            code="user/not-found",
            message="No user found with that username.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    companies = await MembershipRepository(db).companies_for_users([user.id])
    return _serialize_user(user, *companies.get(user.id, (None, None, None)))


@router.get(
    "/search",
    response_model=ListObject[UserResponse],
    status_code=status.HTTP_200_OK,
    summary=docs.SEARCH_USERS_SUMMARY,
    description=docs.SEARCH_USERS_DESCRIPTION,
    responses=docs.SEARCH_USERS_RESPONSES,
)
async def search_users(
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    query: Annotated[str, Query(min_length=1)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    user_status: Annotated[str | None, Query(alias="status")] = None,
) -> ListObject[UserResponse]:
    rows = await UserRepository(db).search(query=query, limit=limit, status=user_status)
    return ListObject[UserResponse](
        object="search_result",
        data=[_serialize_user(row) for row in rows],
        has_more=False,
        url="/users/search",
    )


@router.get(
    "/username-availability",
    response_model=UsernameAvailabilityResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.USERNAME_AVAILABILITY_SUMMARY,
    description=docs.USERNAME_AVAILABILITY_DESCRIPTION,
    responses=docs.USERNAME_AVAILABILITY_RESPONSES,
)
async def check_username_availability(
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    username: Annotated[str, Query(min_length=1, max_length=64)],
    exclude_user_id: str | None = None,
) -> UsernameAvailabilityResponse:
    available, code, reason = await evaluate_username(db, username, exclude_user_id=exclude_user_id)
    return UsernameAvailabilityResponse(
        username=username.strip().lower(),
        available=available,
        code=code,  # type: ignore[arg-type]
        reason=reason,
    )


# ---------------------------------------------------------------------------
# Reserved usernames
# ---------------------------------------------------------------------------


@router.get(
    "/reserved-usernames",
    response_model=ListObject[ReservedUsernameResponse],
    status_code=status.HTTP_200_OK,
    summary=docs.LIST_RESERVED_USERNAMES_SUMMARY,
    description=docs.LIST_RESERVED_USERNAMES_DESCRIPTION,
    responses=docs.LIST_RESERVED_USERNAMES_RESPONSES,
)
async def list_reserved_usernames(
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ListObject[ReservedUsernameResponse]:
    rows = await ReservedUsernameRepository(db).list_all()
    return ListObject[ReservedUsernameResponse](
        data=[ReservedUsernameResponse.model_validate(r) for r in rows],
        has_more=False,
        url="/users/reserved-usernames",
        total_count=len(rows),
    )


@router.post(
    "/reserved-usernames",
    response_model=ReservedUsernameResponse,
    status_code=status.HTTP_201_CREATED,
    summary=docs.CREATE_RESERVED_USERNAME_SUMMARY,
    description=docs.CREATE_RESERVED_USERNAME_DESCRIPTION,
    responses=docs.CREATE_RESERVED_USERNAME_RESPONSES,
)
async def create_reserved_username(
    body: ReservedUsernameCreate,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ReservedUsernameResponse:
    from .username import validate_username_format

    candidate = validate_username_format(body.username)
    repo = ReservedUsernameRepository(db)
    if await repo.is_reserved(candidate):
        raise AppHTTPException(
            code="reserved_username/already-exists",
            message="This username is already on the reserved list.",
            http_status_code=status.HTTP_409_CONFLICT,
        )
    row = await repo.create(candidate, reason=body.reason)
    logger.info("reserved_usernames.create", username=candidate)
    return ReservedUsernameResponse.model_validate(row)


@router.delete(
    "/reserved-usernames/{username}",
    response_model=ReservedUsernameDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.DELETE_RESERVED_USERNAME_SUMMARY,
    description=docs.DELETE_RESERVED_USERNAME_DESCRIPTION,
    responses=docs.DELETE_RESERVED_USERNAME_RESPONSES,
)
async def delete_reserved_username(
    username: Annotated[str, Path(min_length=1, max_length=64)],
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ReservedUsernameDeleteResponse:
    deleted = await ReservedUsernameRepository(db).delete(username)
    if not deleted:
        raise AppHTTPException(
            code="reserved_username/not-found",
            message="No reserved username found with this value.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    logger.info("reserved_usernames.delete", username=username.lower().strip())
    return ReservedUsernameDeleteResponse(username=username.lower().strip())


@router.get(
    "/by-workos-id/{workos_user_id}",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.GET_BY_WORKOS_ID_SUMMARY,
    description=docs.GET_BY_WORKOS_ID_DESCRIPTION,
    responses=docs.GET_BY_WORKOS_ID_RESPONSES,
)
async def get_user_by_workos_id(
    workos_user_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserResponse:
    repo = UserRepository(db)
    user = await repo.get_by_workos_id(workos_user_id)
    if not user:
        raise AppHTTPException(
            code="user/not-found",
            message="User not found.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    companies = await MembershipRepository(db).companies_for_users([user.id])
    return _serialize_user(user, *companies.get(user.id, (None, None, None)))


@router.get(
    "/{user_id}/oauth-grants",
    response_model=list[AuthorizedAppResponse],
    status_code=status.HTTP_200_OK,
    summary=docs.LIST_OAUTH_GRANTS_SUMMARY,
    description=docs.LIST_OAUTH_GRANTS_DESCRIPTION,
    responses=docs.LIST_OAUTH_GRANTS_RESPONSES,
)
async def get_user_oauth_grants(
    user_id: str,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[AuthorizedAppResponse]:
    if not (principal.internal or principal.user_id == user_id):
        raise AppHTTPException(
            code="auth/forbidden",
            message="Forbidden.",
            http_status_code=status.HTTP_403_FORBIDDEN,
        )
    if not user_id:
        raise AppHTTPException(
            code="provider/invalid-request",
            message="userId is required.",
            http_status_code=status.HTTP_400_BAD_REQUEST,
        )

    stmt = (
        select(OauthGrant)
        .where(OauthGrant.user_id == user_id, OauthGrant.revoked_at.is_(None))
        .options(joinedload(OauthGrant.app))
        .order_by(OauthGrant.updated_at.desc())
    )
    records = list((await db.scalars(stmt)).all())

    result = []
    for r in records:
        result.append(
            AuthorizedAppResponse(
                id=r.id,
                appId=r.app_id,
                name=r.app.name,
                clientId=r.app.client_id,
                logoUrl=r.app.logo_url,
                homepageUrl=r.app.homepage_url,
                scopes=r.scopes or [],
                createdAt=r.created_at,
                updatedAt=r.updated_at,
            )
        )
    return result


@router.get(
    "/{user_id}/apps",
    response_model=ListObject[UserAppResponse],
    status_code=status.HTTP_200_OK,
    summary=docs.LIST_USER_APPS_SUMMARY,
    description=docs.LIST_USER_APPS_DESCRIPTION,
    responses=docs.LIST_USER_APPS_RESPONSES,
)
async def list_user_apps(
    user_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ListObject[UserAppResponse]:
    await _require_user(db, user_id)
    enrollments = await UserAppEnrollmentRepository(db).list_for_user(user_id)
    return ListObject[UserAppResponse](
        data=[
            UserAppResponse(
                id=e.app.id,
                name=e.app.name,
                slug=e.app.slug,
                logo_url=e.app.logo_url,
                homepage_url=e.app.homepage_url,
                app_kind=e.app.app_kind,
                status=e.app.status,
                enrolled_at=e.enrolled_at,
                last_seen_at=e.last_seen_at,
            )
            for e in enrollments
        ],
        has_more=False,
        url=f"/users/{user_id}/apps",
        total_count=len(enrollments),
    )


@router.post(
    "/{user_id}/oauth-grants/{grant_id}/revoke",
    response_model=UserOAuthGrantRevokeResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.REVOKE_OAUTH_GRANT_SUMMARY,
    description=docs.REVOKE_OAUTH_GRANT_DESCRIPTION,
)
async def revoke_user_oauth_grant(
    user_id: str,
    grant_id: str,
    principal: SessionDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserOAuthGrantRevokeResponse:
    if not (principal.internal or principal.user_id == user_id):
        raise AppHTTPException(
            code="auth/forbidden",
            message="Forbidden.",
            http_status_code=status.HTTP_403_FORBIDDEN,
        )
    now = now_unix_seconds()
    stmt = (
        update(OauthGrant)
        .where(
            OauthGrant.id == grant_id,
            OauthGrant.user_id == user_id,
            OauthGrant.revoked_at.is_(None),
        )
        .values(revoked_at=now, updated_at=now)
    )
    result = await db.execute(stmt)
    if getattr(result, "rowcount", 0) == 0:
        raise AppHTTPException(
            code="oauth-grant/not-found",
            message="No active OAuth grant exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return UserOAuthGrantRevokeResponse(revoked=True)


@router.post(
    "/ensure",
    response_model=EnsuredUserResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.ENSURE_USER_SUMMARY,
    description=docs.ENSURE_USER_DESCRIPTION,
    responses=docs.ENSURE_USER_RESPONSES,
)
async def ensure_user(
    body: UserEnsureRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EnsuredUserResponse:
    repo = UserRepository(db)
    user = await repo.get_by_workos_id(body.workos_user_id)
    if user:
        return _serialize_ensured_user(user)

    now = now_unix_seconds()
    first_name = body.first_name if body.first_name is not None else body.email.split("@")[0]
    last_name = body.last_name if body.last_name is not None else "User"

    # `ensure` is an app-API-key-tier endpoint used to bootstrap a session user.
    # The platform role is NEVER client-settable here: that would let any holder
    # of an app key mint a privileged account. Elevation goes through the
    # admin-only (AdminDep) update path instead.
    email = body.email.lower().strip()
    user_id = generate_platform_owner_user_id() if get_settings().is_owner_email(email) else generate_id("user")

    # Bootstrap path (app-key tier): never hard-fail a login over a username.
    # Keep a provided username only if it clears every gate; otherwise drop it.
    ensured_username: str | None = None
    if body.username:
        available, _code, _reason = await evaluate_username(db, body.username)
        if available:
            ensured_username = body.username.strip().lower()

    user = await repo.create(
        id=user_id,
        workos_user_id=body.workos_user_id,
        email=email,
        email_verified=body.email_verified if body.email_verified is not None else False,
        first_name=first_name,
        last_name=last_name,
        avatar=body.avatar,
        username=ensured_username,
        role="owner" if get_settings().is_owner_email(email) else "user",
        platform_role="owner" if get_settings().is_owner_email(email) else None,
        status="active",
        created_at=now,
        updated_at=now,
    )
    await enqueue_customer_ensure_for_user(db, user, now)

    profile = UserProfile(
        id=generate_id("userProfile"),
        user_id=user_id,
        created_at=now,
        updated_at=now,
    )
    db.add(profile)
    await db.flush()

    return _serialize_ensured_user(user)


@router.get(
    "",
    response_model=ListObject[UserResponse],
    status_code=status.HTTP_200_OK,
    summary=docs.LIST_USERS_SUMMARY,
    description=docs.LIST_USERS_DESCRIPTION,
    responses=docs.LIST_USERS_RESPONSES,
)
async def list_users(
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    starting_after: str | None = None,
    ending_before: str | None = None,
    search: str | None = None,
    include_deleted: bool = False,
    user_status: Annotated[str | None, Query(alias="status")] = None,
) -> ListObject[UserResponse]:
    repo = UserRepository(db)
    membership_repo = MembershipRepository(db)
    if search:
        rows = await repo.search(
            query=search, limit=limit, include_deleted=include_deleted, status=user_status
        )
        companies = await membership_repo.companies_for_users([r.id for r in rows])
        return ListObject[UserResponse](
            data=[_serialize_user(r, *companies.get(r.id, (None, None, None))) for r in rows],
            has_more=False,
            url="/users",
        )

    rows, has_more = await repo.list(
        limit=limit,
        starting_after=starting_after,
        ending_before=ending_before,
        include_deleted=include_deleted,
        status=user_status,
    )
    companies = await membership_repo.companies_for_users([row.id for row in rows])
    return ListObject[UserResponse](
        data=[_serialize_user(row, *companies.get(row.id, (None, None, None))) for row in rows],
        has_more=has_more,
        url="/users",
    )


@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary=docs.CREATE_USER_SUMMARY,
    description=docs.CREATE_USER_DESCRIPTION,
    responses=docs.CREATE_USER_RESPONSES,
)
async def create_user(
    _admin: AdminDep,
    body: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserResponse:
    repo = UserRepository(db)
    email = body.email.lower().strip()
    if await repo.get_by_email(email):
        raise AppHTTPException(
            code="user/duplicate-email",
            message="A user with this email already exists.",
            http_status_code=status.HTTP_409_CONFLICT,
        )

    settings = get_settings()
    workos_client = get_workos_client(settings)
    try:
        workos_user = await workos_client.create_user(
            email=email,
            first_name=body.first_name,
            last_name=body.last_name,
            email_verified=False,
        )
    except AppHTTPException:
        raise
    except Exception:
        logger.error("workos.create_user failed", email=email, exc_info=True)
        raise AppHTTPException(
            code="user/provider-error",
            message="Could not create user in the identity provider.",
            http_status_code=status.HTTP_502_BAD_GATEWAY,
        )

    workos_user_id: str = workos_user["id"]

    # Send a password-setup email so the user can verify their address and set a password.
    # Best-effort — failure does not abort user creation.
    if settings.workos_client_id:
        try:
            await workos_client.create_password_reset(email=email, client_id=settings.workos_client_id)
        except Exception:
            logger.warning(
                "workos.password_reset_email failed",
                email=email,
                workos_user_id=workos_user_id,
                exc_info=True,
            )

    # An explicitly chosen username is rejected if invalid/reserved/taken; a
    # derived one (from the email prefix) is normalized and made unique.
    if body.username:
        username = await assert_username_available(db, body.username)
    else:
        username = await _unique_username(db, _normalize_username(email.split("@", 1)[0]), set())
    now = now_unix_seconds()
    is_owner = get_settings().is_owner_email(email)
    user_id = generate_platform_owner_user_id() if is_owner else generate_id("user")
    user = await repo.create(
        id=user_id,
        workos_user_id=workos_user_id,
        email=email,
        username=username,
        email_verified=body.email_verified if body.email_verified is not None else False,
        first_name=body.first_name,
        last_name=body.last_name,
        middle_name=body.middle_name,
        avatar=body.avatar,
        role="owner" if is_owner else "user",
        platform_role="owner" if is_owner else None,
        status=body.status or "active",
        created_at=now,
        updated_at=now,
    )
    await enqueue_customer_ensure_for_user(db, user, now)

    db.add(UserProfile(id=generate_id("userProfile"), user_id=user_id, created_at=now, updated_at=now))
    await db.flush()
    logger.info(
        "users.create",
        user_id=user_id,
        email=email,
        workos_user_id=workos_user_id,
    )
    return _serialize_user(user)


@router.get(
    "/{user_id}",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.RETRIEVE_USER_SUMMARY,
    description=docs.RETRIEVE_USER_DESCRIPTION,
    responses=docs.RETRIEVE_USER_RESPONSES,
)
async def retrieve_user(
    user_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    include_deleted: bool = False,
) -> UserResponse:
    user = await UserRepository(db).get_by_id(user_id, include_deleted=include_deleted)
    if not user:
        raise AppHTTPException(
            code="user/not-found",
            message="No user exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    companies = await MembershipRepository(db).companies_for_users([user.id])
    return _serialize_user(user, *companies.get(user.id, (None, None, None)))


@router.patch(
    "/{user_id}",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.UPDATE_USER_SUMMARY,
    description=docs.UPDATE_USER_DESCRIPTION,
    responses=docs.UPDATE_USER_RESPONSES,
)
async def update_user(
    user_id: str,
    body: UserUpdate,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserResponse:
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise AppHTTPException(
            code="user/not-found",
            message="No user exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )

    update_data: dict[str, Any] = {}
    now = now_unix_seconds()
    explicitly_set = body.model_dump(exclude_unset=True)
    if body.email is not None:
        update_data["email"] = body.email
    if "username" in explicitly_set:
        if body.username is None:
            update_data["username"] = None  # nullable — allow clearing
        else:
            update_data["username"] = await assert_username_available(db, body.username, exclude_user_id=user_id)
    if body.first_name is not None:
        update_data["first_name"] = body.first_name
    if body.last_name is not None:
        update_data["last_name"] = body.last_name
    if "middle_name" in explicitly_set:
        update_data["middle_name"] = body.middle_name  # nullable — allow clearing
    if "avatar" in explicitly_set:
        update_data["avatar"] = body.avatar  # nullable — allow clearing
    if body.status is not None:
        update_data["status"] = body.status
    if "stripe_customer_id" in explicitly_set:
        update_data["stripe_customer_id"] = body.stripe_customer_id  # nullable — allow clearing
    if body.email_verified is not None:
        update_data["email_verified"] = body.email_verified

    if update_data:
        update_data["updated_at"] = now
        updated = await repo.update(user_id, **update_data)
        if updated:
            user = updated
        logger.info("users.update", user_id=user_id, changed_fields=sorted(update_data.keys()))

    return _serialize_user(user)


@router.delete(
    "/{user_id}",
    response_model=UserDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.DELETE_USER_SUMMARY,
    description=docs.DELETE_USER_DESCRIPTION,
    responses=docs.DELETE_USER_RESPONSES,
)
async def delete_user(
    user_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    deleted_by: str | None = None,
    reason: str | None = None,
) -> UserDeleteResponse:
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id, include_deleted=True)
    if not user:
        raise AppHTTPException(
            code="user/not-found",
            message="No user exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    await repo.delete(user_id, deleted_by=deleted_by, reason=reason)
    logger.info("users.delete", user_id=user_id, email=user.email)
    return UserDeleteResponse(id=user_id)


@router.delete(
    "/{user_id}/purge",
    response_model=UserDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary="Purge user",
    description=(
        "Permanently removes a user record from the database. This cannot be undone. "
        "To retain the record while making it inaccessible, use soft delete (`DELETE /{user_id}`) instead. "
        "**Admin only.**"
    ),
)
async def purge_user(
    user_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    deleted_by: str | None = None,
) -> UserDeleteResponse:
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id, include_deleted=True)
    if not user:
        raise AppHTTPException(
            code="user/not-found",
            message="No user exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    await repo.purge(user_id)
    logger.info("users.purge", user_id=user_id, email=user.email, purged_by=deleted_by)
    return UserDeleteResponse(id=user_id)


@router.post(
    "/{user_id}/ban",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.BAN_USER_SUMMARY,
    description=docs.BAN_USER_DESCRIPTION,
    responses=docs.BAN_USER_RESPONSES,
)
async def ban_user(
    user_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    body: UserBanRequest | None = None,
) -> UserResponse:
    repo = UserRepository(db)
    user = await _require_user(db, user_id)
    reason = body.reason if body else None
    updated = await repo.set_banned(user_id, banned=True, reason=reason)
    # Revoke every active session so the ban takes effect immediately, even for a
    # user who is currently signed in (the session cookie lives for ~400 days).
    revoked = await SessionRepository(db).delete_all_for_user(user_id)
    logger.info("users.ban", user_id=user_id, email=user.email, sessions_revoked=revoked)
    companies = await MembershipRepository(db).companies_for_users([user_id])
    return _serialize_user(updated or user, *companies.get(user_id, (None, None, None)))


@router.post(
    "/{user_id}/unban",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.UNBAN_USER_SUMMARY,
    description=docs.UNBAN_USER_DESCRIPTION,
    responses=docs.UNBAN_USER_RESPONSES,
)
async def unban_user(
    user_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserResponse:
    repo = UserRepository(db)
    user = await _require_user(db, user_id)
    updated = await repo.set_banned(user_id, banned=False)
    logger.info("users.unban", user_id=user_id, email=user.email)
    companies = await MembershipRepository(db).companies_for_users([user_id])
    return _serialize_user(updated or user, *companies.get(user_id, (None, None, None)))


@router.post(
    "/backfill-usernames",
    response_model=UserBackfillUsernamesResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.BACKFILL_USERNAMES_SUMMARY,
    description=docs.BACKFILL_USERNAMES_DESCRIPTION,
    responses=docs.BACKFILL_USERNAMES_RESPONSES,
)
async def backfill_usernames(
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserBackfillUsernamesResponse:
    stmt = select(User).order_by(User.created_at.asc(), User.id.asc())
    users = list((await db.scalars(stmt)).all())
    reserved = {user.username for user in users if user.username}
    # Load the reserved list once for the whole batch instead of querying it for
    # every generated candidate.
    reserved_names = {row.username for row in await ReservedUsernameRepository(db).list_all()}
    updated_ids: list[str] = []
    now = now_unix_seconds()

    for user in users:
        if user.username or not user.email:
            continue
        base = _normalize_username(user.email.split("@", 1)[0])
        user.username = await _unique_username(db, base, reserved, reserved_names=reserved_names)
        user.updated_at = now
        updated_ids.append(user.id)

    await db.flush()
    return UserBackfillUsernamesResponse(updated=len(updated_ids), ids=updated_ids)


@router.get(
    "/{user_id}/features",
    response_model=ListObject[UserFeatureResponse],
    status_code=status.HTTP_200_OK,
    summary=docs.LIST_USER_FEATURES_SUMMARY,
    description=docs.LIST_USER_FEATURES_DESCRIPTION,
    responses=docs.LIST_USER_FEATURES_RESPONSES,
)
async def list_user_features(
    user_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ListObject[UserFeatureResponse]:
    user = await UserRepository(db).get_by_id(user_id)
    if not user:
        raise AppHTTPException(
            code="user/not-found",
            message="No user exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )

    stmt = select(UserFeature).where(UserFeature.user_id == user_id).options(joinedload(UserFeature.feature))
    rows = list((await db.scalars(stmt)).all())

    return ListObject[UserFeatureResponse](
        data=[_serialize_user_feature(row) for row in rows],
        has_more=False,
        url=f"/users/{user_id}/features",
    )


@router.post(
    "/{user_id}/features",
    response_model=UserFeatureResponse,
    status_code=status.HTTP_201_CREATED,
    summary=docs.GRANT_USER_FEATURE_SUMMARY,
    description=docs.GRANT_USER_FEATURE_DESCRIPTION,
    responses=docs.GRANT_USER_FEATURE_RESPONSES,
)
async def grant_user_feature(
    user_id: str,
    _admin: AdminDep,
    body: GrantFeatureRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserFeatureResponse:
    grant = await FeatureService(db).grant_user_feature(
        user_id=user_id,
        feature_id=body.feature_id,
        enabled=True,
        note=body.note,
    )
    await db.commit()
    return _serialize_user_feature(grant)


@router.delete(
    "/{user_id}/features/{feature_id}",
    response_model=UserFeatureResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.DISABLE_USER_FEATURE_SUMMARY,
    description=docs.DISABLE_USER_FEATURE_DESCRIPTION,
    responses=docs.DISABLE_USER_FEATURE_RESPONSES,
)
async def disable_user_feature(
    user_id: str,
    feature_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    note: Annotated[str | None, Query()] = None,
) -> UserFeatureResponse:
    grant = await FeatureService(db).grant_user_feature(
        user_id=user_id,
        feature_id=feature_id,
        enabled=False,
        note=note,
    )
    await db.commit()
    return _serialize_user_feature(grant)


# ---------------------------------------------------------------------------
# Unlink auth account
# ---------------------------------------------------------------------------


@router.delete(
    "/{user_id}/accounts/{account_id}",
    response_model=UserAccountUnlinkResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.UNLINK_USER_ACCOUNT_SUMMARY,
    description=docs.UNLINK_USER_ACCOUNT_DESCRIPTION,
    responses=docs.UNLINK_USER_ACCOUNT_RESPONSES,
)
async def unlink_user_account(
    user_id: str,
    account_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserAccountUnlinkResponse:
    await _require_user(db, user_id)
    repo = UserAccountRepository(db)
    account = await repo.get(account_id, user_id)
    if not account:
        raise AppHTTPException(
            code="account/not-found",
            message="No linked account found with this ID for the specified user.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    await repo.delete(account_id, user_id)
    logger.info("users.unlink_account", user_id=user_id, account_id=account_id)
    return UserAccountUnlinkResponse(id=account_id)


# ---------------------------------------------------------------------------
# Revoke all sessions (force logout without ban)
# ---------------------------------------------------------------------------


@router.post(
    "/{user_id}/sessions/revoke",
    response_model=UserSessionRevokeResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.REVOKE_USER_SESSIONS_SUMMARY,
    description=docs.REVOKE_USER_SESSIONS_DESCRIPTION,
    responses=docs.REVOKE_USER_SESSIONS_RESPONSES,
)
async def revoke_user_sessions(
    user_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserSessionRevokeResponse:
    await _require_user(db, user_id)
    revoked = await SessionRepository(db).delete_all_for_user(user_id)
    logger.info("users.revoke_sessions", user_id=user_id, sessions_revoked=revoked)
    return UserSessionRevokeResponse(user_id=user_id, sessions_revoked=revoked)


# ---------------------------------------------------------------------------
# Identifications (sensitive verified identifiers, entitlement-gated)
# ---------------------------------------------------------------------------


@router.get(
    "/{user_id}/identifications",
    response_model=ListObject[UserIdentificationResponse],
    status_code=status.HTTP_200_OK,
    summary=docs.LIST_USER_IDENTIFICATIONS_SUMMARY,
    description=docs.LIST_USER_IDENTIFICATIONS_DESCRIPTION,
    responses=docs.LIST_USER_IDENTIFICATIONS_RESPONSES,
)
async def list_user_identifications(
    user_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ListObject[UserIdentificationResponse]:
    await _require_user(db, user_id)
    rows = await UserIdentificationRepository(db).list_by_user(user_id)
    return ListObject[UserIdentificationResponse](
        data=[_serialize_user_identification(row) for row in rows],
        has_more=False,
        url=f"/users/{user_id}/identifications",
        total_count=len(rows),
    )


@router.post(
    "/{user_id}/identifications",
    response_model=UserIdentificationResponse,
    status_code=status.HTTP_201_CREATED,
    summary=docs.CREATE_USER_IDENTIFICATION_SUMMARY,
    description=docs.CREATE_USER_IDENTIFICATION_DESCRIPTION,
    responses=docs.CREATE_USER_IDENTIFICATION_RESPONSES,
)
async def create_user_identification(
    user_id: str,
    body: UserIdentificationCreate,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserIdentificationResponse:
    await _require_user(db, user_id)

    config = IDENTIFICATION_TYPES.get(body.type)
    if config is None:
        raise AppHTTPException(
            code="identification/unknown-type",
            message="Unknown identification type.",
            http_status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        )

    normalized_value = normalize_identification_value(body.type, body.value)
    if not is_valid_identification_value(body.type, normalized_value):
        raise AppHTTPException(
            code="identification/invalid-value",
            message="The provided value is not valid for this identification type.",
            http_status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        )

    repo = UserIdentificationRepository(db)
    existing = await repo.get_by_type(user_id, body.type)
    if existing:
        raise AppHTTPException(
            code="identification/already-exists",
            message="An identification of this type already exists for this user.",
            http_status_code=status.HTTP_409_CONFLICT,
        )

    now = now_unix_seconds()
    row = await repo.create(
        id=generate_id("userIdentification"),
        user_id=user_id,
        type=body.type,
        value=normalized_value,
        country_code=body.country_code if body.country_code is not None else config.country_code,
        verified=False,
        verified_at=None,
        verified_by=None,
        created_at=now,
        updated_at=now,
    )
    logger.info("users.identifications.create", user_id=user_id, type=body.type)
    return _serialize_user_identification(row)


@router.patch(
    "/{user_id}/identifications/{type}",
    response_model=UserIdentificationResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.UPDATE_USER_IDENTIFICATION_SUMMARY,
    description=docs.UPDATE_USER_IDENTIFICATION_DESCRIPTION,
    responses=docs.UPDATE_USER_IDENTIFICATION_RESPONSES,
)
async def update_user_identification(
    user_id: str,
    type: str,
    body: UserIdentificationUpdate,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserIdentificationResponse:
    repo = UserIdentificationRepository(db)
    existing = await repo.get_by_type(user_id, type)
    if not existing:
        raise AppHTTPException(
            code="identification/not-found",
            message="No identification of this type exists for this user.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )

    normalized_value = normalize_identification_value(type, body.value)
    if not is_valid_identification_value(type, normalized_value):
        raise AppHTTPException(
            code="identification/invalid-value",
            message="The provided value is not valid for this identification type.",
            http_status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        )

    now = now_unix_seconds()
    updated = await repo.update_value(
        existing.id,
        value=normalized_value,
        country_code=body.country_code if body.country_code is not None else existing.country_code,
        verified=False,
        verified_at=None,
        verified_by=None,
        updated_at=now,
    )
    if not updated:
        raise AppHTTPException(
            code="identification/not-found",
            message="No identification of this type exists for this user.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    logger.info("users.identifications.update", user_id=user_id, type=type)
    return _serialize_user_identification(updated)


@router.delete(
    "/{user_id}/identifications/{type}",
    response_model=UserIdentificationDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.DELETE_USER_IDENTIFICATION_SUMMARY,
    description=docs.DELETE_USER_IDENTIFICATION_DESCRIPTION,
    responses=docs.DELETE_USER_IDENTIFICATION_RESPONSES,
)
async def delete_user_identification(
    user_id: str,
    type: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    deleted_by: str | None = None,
    reason: str | None = None,
) -> UserIdentificationDeleteResponse:
    repo = UserIdentificationRepository(db)
    existing = await repo.get_by_type(user_id, type)
    if not existing:
        raise AppHTTPException(
            code="identification/not-found",
            message="No identification of this type exists for this user.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )

    deleted = await repo.delete(existing.id, deleted_by=deleted_by, reason=reason)
    if not deleted:
        raise AppHTTPException(
            code="identification/not-found",
            message="No identification of this type exists for this user.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    logger.info("users.identifications.delete", user_id=user_id, type=type)
    return UserIdentificationDeleteResponse(id=existing.id)


@router.post(
    "/{user_id}/identifications/{type}/disclose",
    response_model=UserIdentificationDisclosureResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.DISCLOSE_USER_IDENTIFICATION_SUMMARY,
    description=docs.DISCLOSE_USER_IDENTIFICATION_DESCRIPTION,
    responses=docs.DISCLOSE_USER_IDENTIFICATION_RESPONSES,
)
async def disclose_user_identification(
    user_id: str,
    type: str,
    body: UserIdentificationDiscloseRequest,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserIdentificationDisclosureResponse:
    identification = await UserIdentificationRepository(db).get_by_type(user_id, type)
    if not identification:
        raise AppHTTPException(
            code="identification/not-found",
            message="No identification of this type exists for this user.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )

    config = IDENTIFICATION_TYPES.get(type)
    if config is None or body.app_slug not in config.disclosure_app_slugs:
        raise AppHTTPException(
            code="identification/app-not-entitled",
            message="This app is not entitled to view this identification type.",
            http_status_code=status.HTTP_403_FORBIDDEN,
        )

    subscription = await SubscriptionRepository(db).get_by_app_slug(
        org_id=body.organization_id, app_slug=body.app_slug
    )
    if not subscription or subscription.status != "active":
        raise AppHTTPException(
            code="identification/subscription-required",
            message="The requesting organization does not have an active subscription to this app.",
            http_status_code=status.HTTP_403_FORBIDDEN,
        )

    now = now_unix_seconds()
    await AuditEventRepository(db).create(
        id=generate_id("auditEvent"),
        event="user_identification.disclosed",
        source="server",
        app_name=subscription.app.name,
        app_id=subscription.app.id,
        user_id=user_id,
        path=f"/users/{user_id}/identifications/{type}/disclose",
        search=None,
        referrer=None,
        title=None,
        request_id=None,
        session_id=None,
        distinct_id=None,
        properties={
            "organization_id": body.organization_id,
            "app_slug": body.app_slug,
            "identification_type": type,
            "reason": body.reason,
        },
        created_at=now,
    )
    # Never log the raw value — only the fact of disclosure and its context.
    logger.info(
        "users.identifications.disclose",
        user_id=user_id,
        type=type,
        organization_id=body.organization_id,
        app_slug=body.app_slug,
    )

    return UserIdentificationDisclosureResponse(
        type=type,
        value=identification.value,
        country_code=identification.country_code,
        verified=identification.verified,
        disclosed_at=now,
    )


@router.post(
    "/{user_id}/identifications/{type}/verify",
    response_model=UserIdentificationResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.VERIFY_USER_IDENTIFICATION_SUMMARY,
    description=docs.VERIFY_USER_IDENTIFICATION_DESCRIPTION,
    responses=docs.VERIFY_USER_IDENTIFICATION_RESPONSES,
)
async def verify_user_identification(
    user_id: str,
    type: str,
    body: UserIdentificationVerifyRequest,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserIdentificationResponse:
    repo = UserIdentificationRepository(db)
    existing = await repo.get_by_type(user_id, type)
    if not existing:
        raise AppHTTPException(
            code="identification/not-found",
            message="No identification of this type exists for this user.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )

    now = now_unix_seconds()
    updated = await repo.set_verified(existing.id, verified_by=body.verified_by, verified_at=now, updated_at=now)
    if not updated:
        raise AppHTTPException(
            code="identification/not-found",
            message="No identification of this type exists for this user.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    logger.info("users.identifications.verify", user_id=user_id, type=type, verified_by=body.verified_by)
    return _serialize_user_identification(updated)
