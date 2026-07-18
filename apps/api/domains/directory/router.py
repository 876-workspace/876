from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.errors import AppHTTPException
from core.responses import ListObject
from core.security import AdminDep, Principal, resolve_principal
from db.models.directory import (
    Bank,
    BankAccount,
    BankBranch,
    CreditUnion,
    CreditUnionBranch,
    DirectoryAddress,
    Ministry,
    MinistryDepartment,
    SecondarySchool,
    University,
    UniversityCampus,
)
from db.repositories.directory import DirectoryRepository
from db.session import get_db

from . import docs
from .schemas import (
    BankAccountCreate,
    BankAccountDeleteResponse,
    BankAccountResponse,
    BankAccountUpdate,
    BankBranchCreate,
    BankBranchDeleteResponse,
    BankBranchResponse,
    BankBranchUpdate,
    BankCreate,
    BankDeleteResponse,
    BankResponse,
    BankUpdate,
    CreditUnionBranchCreate,
    CreditUnionBranchDeleteResponse,
    CreditUnionBranchResponse,
    CreditUnionBranchUpdate,
    CreditUnionCreate,
    CreditUnionDeleteResponse,
    CreditUnionResponse,
    CreditUnionUpdate,
    DirectoryAddressResponse,
    MinistryCreate,
    MinistryDeleteResponse,
    MinistryDepartmentCreate,
    MinistryDepartmentDeleteResponse,
    MinistryDepartmentResponse,
    MinistryDepartmentUpdate,
    MinistryResponse,
    MinistryUpdate,
    SecondarySchoolCreate,
    SecondarySchoolDeleteResponse,
    SecondarySchoolResponse,
    SecondarySchoolUpdate,
    UniversityCampusCreate,
    UniversityCampusDeleteResponse,
    UniversityCampusResponse,
    UniversityCampusUpdate,
    UniversityCreate,
    UniversityDeleteResponse,
    UniversityResponse,
    UniversityUpdate,
)

router = APIRouter(prefix="/directory", tags=["Directory"])


# --- Serialization Helpers ---

def _serialize_directory_address(row: DirectoryAddress) -> DirectoryAddressResponse:
    return DirectoryAddressResponse(
        object="directory_address",
        id=row.id,
        line1=row.line1,
        line2=row.line2,
        city=row.city,
        state=row.state,
        postal_code=row.postal_code,
        country=row.country,
        latitude=row.latitude,
        longitude=row.longitude,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _serialize_bank(row: Bank) -> BankResponse:
    return BankResponse(
        object="bank",
        id=row.id,
        name=row.name,
        short_name=row.short_name,
        bank_code=row.bank_code,
        swift_code=row.swift_code,
        logo_url=row.logo_url,
        head_office=row.head_office,
        website=row.website,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _serialize_bank_branch(row: BankBranch) -> BankBranchResponse:
    return BankBranchResponse(
        object="bank_branch",
        id=row.id,
        bank_id=row.bank_id,
        name=row.name,
        transit_number=row.transit_number,
        routing_number=row.routing_number,
        address_id=row.address_id,
        contact_number=row.contact_number,
        operating_hours=row.operating_hours,
        address=_serialize_directory_address(row.address),
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _serialize_credit_union(row: CreditUnion) -> CreditUnionResponse:
    return CreditUnionResponse(
        object="credit_union",
        id=row.id,
        name=row.name,
        short_name=row.short_name,
        logo_url=row.logo_url,
        headquarters=row.headquarters,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _serialize_credit_union_branch(row: CreditUnionBranch) -> CreditUnionBranchResponse:
    return CreditUnionBranchResponse(
        object="credit_union_branch",
        id=row.id,
        credit_union_id=row.credit_union_id,
        name=row.name,
        address_id=row.address_id,
        contact_number=row.contact_number,
        email=row.email,
        address=_serialize_directory_address(row.address),
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _serialize_bank_account(row: BankAccount) -> BankAccountResponse:
    return BankAccountResponse(
        object="bank_account",
        id=row.id,
        account_holder=row.account_holder,
        bank_id=row.bank_id,
        branch_id=row.branch_id,
        account_number=row.account_number,
        account_type=row.account_type,
        currency=row.currency,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _serialize_ministry(row: Ministry) -> MinistryResponse:
    return MinistryResponse(
        object="ministry",
        id=row.id,
        name=row.name,
        portfolio=row.portfolio,
        minister=row.minister,
        website=row.website,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _serialize_ministry_department(row: MinistryDepartment) -> MinistryDepartmentResponse:
    return MinistryDepartmentResponse(
        object="ministry_department",
        id=row.id,
        ministry_id=row.ministry_id,
        name=row.name,
        description=row.description,
        address_id=row.address_id,
        contact_email=row.contact_email,
        contact_number=row.contact_number,
        address=_serialize_directory_address(row.address),
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _serialize_university(row: University) -> UniversityResponse:
    return UniversityResponse(
        object="university",
        id=row.id,
        name=row.name,
        acronym=row.acronym,
        logo_url=row.logo_url,
        website=row.website,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _serialize_university_campus(row: UniversityCampus) -> UniversityCampusResponse:
    return UniversityCampusResponse(
        object="university_campus",
        id=row.id,
        university_id=row.university_id,
        name=row.name,
        is_main_campus=row.is_main_campus,
        address_id=row.address_id,
        contact_number=row.contact_number,
        email=row.email,
        address=_serialize_directory_address(row.address),
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _serialize_secondary_school(row: SecondarySchool) -> SecondarySchoolResponse:
    return SecondarySchoolResponse(
        object="secondary_school",
        id=row.id,
        name=row.name,
        principal=row.principal,
        school_type=row.school_type,
        logo_url=row.logo_url,
        address_id=row.address_id,
        contact_number=row.contact_number,
        email=row.email,
        address=_serialize_directory_address(row.address),
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


# --- Bank Routes ---

@router.get(
    "/banks",
    response_model=ListObject[BankResponse],
    status_code=status.HTTP_200_OK,
    summary=docs.LIST_BANKS_SUMMARY,
    description=docs.LIST_BANKS_DESCRIPTION,
    responses=docs.LIST_BANKS_RESPONSES,
)
async def list_banks(
    db: Annotated[AsyncSession, Depends(get_db)],
    principal: Annotated[Principal, Depends(resolve_principal)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    starting_after: str | None = None,
    ending_before: str | None = None,
    search: str | None = None,
    include_deleted: bool = False,
) -> ListObject[BankResponse]:
    actual_include = include_deleted if principal.internal else False
    repo = DirectoryRepository(db)
    rows, has_more = await repo.list_banks(
        limit=limit,
        starting_after=starting_after,
        ending_before=ending_before,
        include_deleted=actual_include,
        search=search,
    )
    return ListObject[BankResponse](
        data=[_serialize_bank(r) for r in rows],
        has_more=has_more,
        url="/directory/banks",
    )


@router.get(
    "/banks/{bank_id}",
    response_model=BankResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.RETRIEVE_BANK_SUMMARY,
    description=docs.RETRIEVE_BANK_DESCRIPTION,
    responses=docs.RETRIEVE_BANK_RESPONSES,
)
async def retrieve_bank(
    bank_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    principal: Annotated[Principal, Depends(resolve_principal)],
    include_deleted: bool = False,
) -> BankResponse:
    actual_include = include_deleted if principal.internal else False
    repo = DirectoryRepository(db)
    bank = await repo.get_bank_by_id(bank_id, include_deleted=actual_include)
    if not bank:
        raise AppHTTPException(
            code="bank/not-found",
            message="No bank exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return _serialize_bank(bank)


@router.post(
    "/banks",
    response_model=BankResponse,
    status_code=status.HTTP_201_CREATED,
    summary=docs.CREATE_BANK_SUMMARY,
    description=docs.CREATE_BANK_DESCRIPTION,
    responses=docs.CREATE_BANK_RESPONSES,
)
async def create_bank(
    _admin: AdminDep,
    body: BankCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> BankResponse:
    repo = DirectoryRepository(db)
    existing = await repo.get_bank_by_code(body.bank_code, include_deleted=True)
    if existing:
        raise AppHTTPException(
            code="bank/duplicate-code",
            message="A bank with this code already exists.",
            http_status_code=status.HTTP_409_CONFLICT,
        )
    bank = await repo.create_bank(**body.model_dump())
    return _serialize_bank(bank)


@router.patch(
    "/banks/{bank_id}",
    response_model=BankResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.UPDATE_BANK_SUMMARY,
    description=docs.UPDATE_BANK_DESCRIPTION,
    responses=docs.UPDATE_BANK_RESPONSES,
)
async def update_bank(
    bank_id: str,
    _admin: AdminDep,
    body: BankUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> BankResponse:
    repo = DirectoryRepository(db)
    bank = await repo.get_bank_by_id(bank_id, include_deleted=True)
    if not bank:
        raise AppHTTPException(
            code="bank/not-found",
            message="No bank exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    if body.bank_code:
        existing = await repo.get_bank_by_code(body.bank_code, include_deleted=True)
        if existing and existing.id != bank_id:
            raise AppHTTPException(
                code="bank/duplicate-code",
                message="A bank with this code already exists.",
                http_status_code=status.HTTP_409_CONFLICT,
            )
    updated = await repo.update_bank(bank_id, **body.model_dump(exclude_unset=True))
    assert updated is not None
    return _serialize_bank(updated)


@router.delete(
    "/banks/{bank_id}",
    response_model=BankDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.DELETE_BANK_SUMMARY,
    description=docs.DELETE_BANK_DESCRIPTION,
    responses=docs.DELETE_BANK_RESPONSES,
)
async def delete_bank(
    bank_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    reason: str | None = None,
) -> BankDeleteResponse:
    repo = DirectoryRepository(db)
    deleted = await repo.delete_bank(bank_id, deleted_by=_admin.user_id, reason=reason)
    if not deleted:
        raise AppHTTPException(
            code="bank/not-found",
            message="No bank exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return BankDeleteResponse(id=bank_id)


# --- BankBranch Routes ---

@router.get(
    "/banks/{bank_id}/branches",
    response_model=ListObject[BankBranchResponse],
    status_code=status.HTTP_200_OK,
    summary=docs.LIST_BANK_BRANCHES_SUMMARY,
    description=docs.LIST_BANK_BRANCHES_DESCRIPTION,
    responses=docs.LIST_BANK_BRANCHES_RESPONSES,
)
async def list_bank_branches(
    bank_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    principal: Annotated[Principal, Depends(resolve_principal)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    starting_after: str | None = None,
    ending_before: str | None = None,
    include_deleted: bool = False,
) -> ListObject[BankBranchResponse]:
    actual_include = include_deleted if principal.internal else False
    repo = DirectoryRepository(db)
    rows, has_more = await repo.list_branches(
        bank_id=bank_id,
        limit=limit,
        starting_after=starting_after,
        ending_before=ending_before,
        include_deleted=actual_include,
    )
    return ListObject[BankBranchResponse](
        data=[_serialize_bank_branch(r) for r in rows],
        has_more=has_more,
        url=f"/directory/banks/{bank_id}/branches",
    )


@router.get(
    "/bank-branches/{branch_id}",
    response_model=BankBranchResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.RETRIEVE_BANK_BRANCH_SUMMARY,
    description=docs.RETRIEVE_BANK_BRANCH_DESCRIPTION,
    responses=docs.RETRIEVE_BANK_BRANCH_RESPONSES,
)
async def retrieve_bank_branch(
    branch_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    principal: Annotated[Principal, Depends(resolve_principal)],
    include_deleted: bool = False,
) -> BankBranchResponse:
    actual_include = include_deleted if principal.internal else False
    repo = DirectoryRepository(db)
    branch = await repo.get_branch_by_id(branch_id, include_deleted=actual_include)
    if not branch:
        raise AppHTTPException(
            code="bank_branch/not-found",
            message="No bank branch exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return _serialize_bank_branch(branch)


@router.post(
    "/banks/{bank_id}/branches",
    response_model=BankBranchResponse,
    status_code=status.HTTP_201_CREATED,
    summary=docs.CREATE_BANK_BRANCH_SUMMARY,
    description=docs.CREATE_BANK_BRANCH_DESCRIPTION,
    responses=docs.CREATE_BANK_BRANCH_RESPONSES,
)
async def create_bank_branch(
    bank_id: str,
    _admin: AdminDep,
    body: BankBranchCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> BankBranchResponse:
    repo = DirectoryRepository(db)
    bank = await repo.get_bank_by_id(bank_id, include_deleted=True)
    if not bank:
        raise AppHTTPException(
            code="bank/not-found",
            message="No bank exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    # Check transit number uniqueness for this bank
    stmt = select(BankBranch).where(
        BankBranch.bank_id == bank_id,
        BankBranch.transit_number == body.transit_number,
        BankBranch.deleted_at.is_(None),
    )
    existing = (await db.scalars(stmt)).first()
    if existing:
        raise AppHTTPException(
            code="bank_branch/duplicate-transit-number",
            message="A branch with this transit number already exists for this bank.",
            http_status_code=status.HTTP_409_CONFLICT,
        )

    data = body.model_dump()
    address_data = data.pop("address")
    branch = await repo.create_branch(bank_id, address_data, **data)
    return _serialize_bank_branch(branch)


@router.patch(
    "/bank-branches/{branch_id}",
    response_model=BankBranchResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.UPDATE_BANK_BRANCH_SUMMARY,
    description=docs.UPDATE_BANK_BRANCH_DESCRIPTION,
    responses=docs.UPDATE_BANK_BRANCH_RESPONSES,
)
async def update_bank_branch(
    branch_id: str,
    _admin: AdminDep,
    body: BankBranchUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> BankBranchResponse:
    repo = DirectoryRepository(db)
    branch = await repo.get_branch_by_id(branch_id, include_deleted=True)
    if not branch:
        raise AppHTTPException(
            code="bank_branch/not-found",
            message="No bank branch exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )

    if body.transit_number:
        # Check transit number uniqueness for the branch's bank
        stmt = select(BankBranch).where(
            BankBranch.bank_id == branch.bank_id,
            BankBranch.transit_number == body.transit_number,
            BankBranch.id != branch_id,
            BankBranch.deleted_at.is_(None),
        )
        existing = (await db.scalars(stmt)).first()
        if existing:
            raise AppHTTPException(
                code="bank_branch/duplicate-transit-number",
                message="A branch with this transit number already exists for this bank.",
                http_status_code=status.HTTP_409_CONFLICT,
            )

    data = body.model_dump(exclude_unset=True)
    address_data = data.pop("address", None)
    updated = await repo.update_branch(branch_id, address_data, **data)
    assert updated is not None
    return _serialize_bank_branch(updated)


@router.delete(
    "/bank-branches/{branch_id}",
    response_model=BankBranchDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.DELETE_BANK_BRANCH_SUMMARY,
    description=docs.DELETE_BANK_BRANCH_DESCRIPTION,
    responses=docs.DELETE_BANK_BRANCH_RESPONSES,
)
async def delete_bank_branch(
    branch_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    reason: str | None = None,
) -> BankBranchDeleteResponse:
    repo = DirectoryRepository(db)
    deleted = await repo.delete_branch(branch_id, deleted_by=_admin.user_id, reason=reason)
    if not deleted:
        raise AppHTTPException(
            code="bank_branch/not-found",
            message="No bank branch exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return BankBranchDeleteResponse(id=branch_id)


# --- CreditUnion Routes ---

@router.get(
    "/credit-unions",
    response_model=ListObject[CreditUnionResponse],
    status_code=status.HTTP_200_OK,
    summary=docs.LIST_CREDIT_UNIONS_SUMMARY,
    description=docs.LIST_CREDIT_UNIONS_DESCRIPTION,
    responses=docs.LIST_CREDIT_UNIONS_RESPONSES,
)
async def list_credit_unions(
    db: Annotated[AsyncSession, Depends(get_db)],
    principal: Annotated[Principal, Depends(resolve_principal)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    starting_after: str | None = None,
    ending_before: str | None = None,
    search: str | None = None,
    include_deleted: bool = False,
) -> ListObject[CreditUnionResponse]:
    actual_include = include_deleted if principal.internal else False
    repo = DirectoryRepository(db)
    rows, has_more = await repo.list_credit_unions(
        limit=limit,
        starting_after=starting_after,
        ending_before=ending_before,
        include_deleted=actual_include,
        search=search,
    )
    return ListObject[CreditUnionResponse](
        data=[_serialize_credit_union(r) for r in rows],
        has_more=has_more,
        url="/directory/credit-unions",
    )


@router.get(
    "/credit-unions/{credit_union_id}",
    response_model=CreditUnionResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.RETRIEVE_CREDIT_UNION_SUMMARY,
    description=docs.RETRIEVE_CREDIT_UNION_DESCRIPTION,
    responses=docs.RETRIEVE_CREDIT_UNION_RESPONSES,
)
async def retrieve_credit_union(
    credit_union_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    principal: Annotated[Principal, Depends(resolve_principal)],
    include_deleted: bool = False,
) -> CreditUnionResponse:
    actual_include = include_deleted if principal.internal else False
    repo = DirectoryRepository(db)
    cu = await repo.get_credit_union_by_id(credit_union_id, include_deleted=actual_include)
    if not cu:
        raise AppHTTPException(
            code="credit_union/not-found",
            message="No credit union exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return _serialize_credit_union(cu)


@router.post(
    "/credit-unions",
    response_model=CreditUnionResponse,
    status_code=status.HTTP_201_CREATED,
    summary=docs.CREATE_CREDIT_UNION_SUMMARY,
    description=docs.CREATE_CREDIT_UNION_DESCRIPTION,
    responses=docs.CREATE_CREDIT_UNION_RESPONSES,
)
async def create_credit_union(
    _admin: AdminDep,
    body: CreditUnionCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CreditUnionResponse:
    repo = DirectoryRepository(db)
    cu = await repo.create_credit_union(**body.model_dump())
    return _serialize_credit_union(cu)


@router.patch(
    "/credit-unions/{credit_union_id}",
    response_model=CreditUnionResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.UPDATE_CREDIT_UNION_SUMMARY,
    description=docs.UPDATE_CREDIT_UNION_DESCRIPTION,
    responses=docs.UPDATE_CREDIT_UNION_RESPONSES,
)
async def update_credit_union(
    credit_union_id: str,
    _admin: AdminDep,
    body: CreditUnionUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CreditUnionResponse:
    repo = DirectoryRepository(db)
    cu = await repo.get_credit_union_by_id(credit_union_id, include_deleted=True)
    if not cu:
        raise AppHTTPException(
            code="credit_union/not-found",
            message="No credit union exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    updated = await repo.update_credit_union(credit_union_id, **body.model_dump(exclude_unset=True))
    assert updated is not None
    return _serialize_credit_union(updated)


@router.delete(
    "/credit-unions/{credit_union_id}",
    response_model=CreditUnionDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.DELETE_CREDIT_UNION_SUMMARY,
    description=docs.DELETE_CREDIT_UNION_DESCRIPTION,
    responses=docs.DELETE_CREDIT_UNION_RESPONSES,
)
async def delete_credit_union(
    credit_union_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    reason: str | None = None,
) -> CreditUnionDeleteResponse:
    repo = DirectoryRepository(db)
    deleted = await repo.delete_credit_union(credit_union_id, deleted_by=_admin.user_id, reason=reason)
    if not deleted:
        raise AppHTTPException(
            code="credit_union/not-found",
            message="No credit union exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return CreditUnionDeleteResponse(id=credit_union_id)


# --- CreditUnionBranch Routes ---

@router.get(
    "/credit-unions/{credit_union_id}/branches",
    response_model=ListObject[CreditUnionBranchResponse],
    status_code=status.HTTP_200_OK,
    summary=docs.LIST_CREDIT_UNION_BRANCHES_SUMMARY,
    description=docs.LIST_CREDIT_UNION_BRANCHES_DESCRIPTION,
    responses=docs.LIST_CREDIT_UNION_BRANCHES_RESPONSES,
)
async def list_credit_union_branches(
    credit_union_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    principal: Annotated[Principal, Depends(resolve_principal)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    starting_after: str | None = None,
    ending_before: str | None = None,
    include_deleted: bool = False,
) -> ListObject[CreditUnionBranchResponse]:
    actual_include = include_deleted if principal.internal else False
    repo = DirectoryRepository(db)
    rows, has_more = await repo.list_credit_union_branches(
        credit_union_id=credit_union_id,
        limit=limit,
        starting_after=starting_after,
        ending_before=ending_before,
        include_deleted=actual_include,
    )
    return ListObject[CreditUnionBranchResponse](
        data=[_serialize_credit_union_branch(r) for r in rows],
        has_more=has_more,
        url=f"/directory/credit-unions/{credit_union_id}/branches",
    )


@router.get(
    "/credit-union-branches/{branch_id}",
    response_model=CreditUnionBranchResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.RETRIEVE_CREDIT_UNION_BRANCH_SUMMARY,
    description=docs.RETRIEVE_CREDIT_UNION_BRANCH_DESCRIPTION,
    responses=docs.RETRIEVE_CREDIT_UNION_BRANCH_RESPONSES,
)
async def retrieve_credit_union_branch(
    branch_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    principal: Annotated[Principal, Depends(resolve_principal)],
    include_deleted: bool = False,
) -> CreditUnionBranchResponse:
    actual_include = include_deleted if principal.internal else False
    repo = DirectoryRepository(db)
    branch = await repo.get_credit_union_branch_by_id(branch_id, include_deleted=actual_include)
    if not branch:
        raise AppHTTPException(
            code="credit_union_branch/not-found",
            message="No credit union branch exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return _serialize_credit_union_branch(branch)


@router.post(
    "/credit-unions/{credit_union_id}/branches",
    response_model=CreditUnionBranchResponse,
    status_code=status.HTTP_201_CREATED,
    summary=docs.CREATE_CREDIT_UNION_BRANCH_SUMMARY,
    description=docs.CREATE_CREDIT_UNION_BRANCH_DESCRIPTION,
    responses=docs.CREATE_CREDIT_UNION_BRANCH_RESPONSES,
)
async def create_credit_union_branch(
    credit_union_id: str,
    _admin: AdminDep,
    body: CreditUnionBranchCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CreditUnionBranchResponse:
    repo = DirectoryRepository(db)
    cu = await repo.get_credit_union_by_id(credit_union_id, include_deleted=True)
    if not cu:
        raise AppHTTPException(
            code="credit_union/not-found",
            message="No credit union exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    data = body.model_dump()
    address_data = data.pop("address")
    branch = await repo.create_credit_union_branch(credit_union_id, address_data, **data)
    return _serialize_credit_union_branch(branch)


@router.patch(
    "/credit-union-branches/{branch_id}",
    response_model=CreditUnionBranchResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.UPDATE_CREDIT_UNION_BRANCH_SUMMARY,
    description=docs.UPDATE_CREDIT_UNION_BRANCH_DESCRIPTION,
    responses=docs.UPDATE_CREDIT_UNION_BRANCH_RESPONSES,
)
async def update_credit_union_branch(
    branch_id: str,
    _admin: AdminDep,
    body: CreditUnionBranchUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CreditUnionBranchResponse:
    repo = DirectoryRepository(db)
    branch = await repo.get_credit_union_branch_by_id(branch_id, include_deleted=True)
    if not branch:
        raise AppHTTPException(
            code="credit_union_branch/not-found",
            message="No credit union branch exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    data = body.model_dump(exclude_unset=True)
    address_data = data.pop("address", None)
    updated = await repo.update_credit_union_branch(branch_id, address_data, **data)
    assert updated is not None
    return _serialize_credit_union_branch(updated)


@router.delete(
    "/credit-union-branches/{branch_id}",
    response_model=CreditUnionBranchDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.DELETE_CREDIT_UNION_BRANCH_SUMMARY,
    description=docs.DELETE_CREDIT_UNION_BRANCH_DESCRIPTION,
    responses=docs.DELETE_CREDIT_UNION_BRANCH_RESPONSES,
)
async def delete_credit_union_branch(
    branch_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    reason: str | None = None,
) -> CreditUnionBranchDeleteResponse:
    repo = DirectoryRepository(db)
    deleted = await repo.delete_credit_union_branch(branch_id, deleted_by=_admin.user_id, reason=reason)
    if not deleted:
        raise AppHTTPException(
            code="credit_union_branch/not-found",
            message="No credit union branch exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return CreditUnionBranchDeleteResponse(id=branch_id)


# --- BankAccount Routes ---

@router.get(
    "/bank-accounts",
    response_model=ListObject[BankAccountResponse],
    status_code=status.HTTP_200_OK,
    summary=docs.LIST_BANK_ACCOUNTS_SUMMARY,
    description=docs.LIST_BANK_ACCOUNTS_DESCRIPTION,
    responses=docs.LIST_BANK_ACCOUNTS_RESPONSES,
)
async def list_bank_accounts(
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    starting_after: str | None = None,
    ending_before: str | None = None,
    include_deleted: bool = False,
) -> ListObject[BankAccountResponse]:
    repo = DirectoryRepository(db)
    rows, has_more = await repo.list_bank_accounts(
        limit=limit,
        starting_after=starting_after,
        ending_before=ending_before,
        include_deleted=include_deleted,
    )
    return ListObject[BankAccountResponse](
        data=[_serialize_bank_account(r) for r in rows],
        has_more=has_more,
        url="/directory/bank-accounts",
    )


@router.get(
    "/bank-accounts/{account_id}",
    response_model=BankAccountResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.RETRIEVE_BANK_ACCOUNT_SUMMARY,
    description=docs.RETRIEVE_BANK_ACCOUNT_DESCRIPTION,
    responses=docs.RETRIEVE_BANK_ACCOUNT_RESPONSES,
)
async def retrieve_bank_account(
    account_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    include_deleted: bool = False,
) -> BankAccountResponse:
    repo = DirectoryRepository(db)
    account = await repo.get_bank_account_by_id(account_id, include_deleted=include_deleted)
    if not account:
        raise AppHTTPException(
            code="bank_account/not-found",
            message="No bank account exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return _serialize_bank_account(account)


@router.post(
    "/bank-accounts",
    response_model=BankAccountResponse,
    status_code=status.HTTP_201_CREATED,
    summary=docs.CREATE_BANK_ACCOUNT_SUMMARY,
    description=docs.CREATE_BANK_ACCOUNT_DESCRIPTION,
    responses=docs.CREATE_BANK_ACCOUNT_RESPONSES,
)
async def create_bank_account(
    _admin: AdminDep,
    body: BankAccountCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> BankAccountResponse:
    repo = DirectoryRepository(db)
    bank = await repo.get_bank_by_id(body.bank_id, include_deleted=True)
    if not bank:
        raise AppHTTPException(
            code="bank/not-found",
            message="No bank exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    if body.branch_id:
        branch = await repo.get_branch_by_id(body.branch_id, include_deleted=True)
        if not branch:
            raise AppHTTPException(
                code="bank_branch/not-found",
                message="No bank branch exists with the provided identifier.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )
    account = await repo.create_bank_account(**body.model_dump())
    return _serialize_bank_account(account)


@router.patch(
    "/bank-accounts/{account_id}",
    response_model=BankAccountResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.UPDATE_BANK_ACCOUNT_SUMMARY,
    description=docs.UPDATE_BANK_ACCOUNT_DESCRIPTION,
    responses=docs.UPDATE_BANK_ACCOUNT_RESPONSES,
)
async def update_bank_account(
    account_id: str,
    _admin: AdminDep,
    body: BankAccountUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> BankAccountResponse:
    repo = DirectoryRepository(db)
    account = await repo.get_bank_account_by_id(account_id, include_deleted=True)
    if not account:
        raise AppHTTPException(
            code="bank_account/not-found",
            message="No bank account exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    if body.bank_id:
        bank = await repo.get_bank_by_id(body.bank_id, include_deleted=True)
        if not bank:
            raise AppHTTPException(
                code="bank/not-found",
                message="No bank exists with the provided identifier.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )
    if body.branch_id:
        branch = await repo.get_branch_by_id(body.branch_id, include_deleted=True)
        if not branch:
            raise AppHTTPException(
                code="bank_branch/not-found",
                message="No bank branch exists with the provided identifier.",
                http_status_code=status.HTTP_404_NOT_FOUND,
            )
    updated = await repo.update_bank_account(account_id, **body.model_dump(exclude_unset=True))
    assert updated is not None
    return _serialize_bank_account(updated)


@router.delete(
    "/bank-accounts/{account_id}",
    response_model=BankAccountDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.DELETE_BANK_ACCOUNT_SUMMARY,
    description=docs.DELETE_BANK_ACCOUNT_DESCRIPTION,
    responses=docs.DELETE_BANK_ACCOUNT_RESPONSES,
)
async def delete_bank_account(
    account_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    reason: str | None = None,
) -> BankAccountDeleteResponse:
    repo = DirectoryRepository(db)
    deleted = await repo.delete_bank_account(account_id, deleted_by=_admin.user_id, reason=reason)
    if not deleted:
        raise AppHTTPException(
            code="bank_account/not-found",
            message="No bank account exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return BankAccountDeleteResponse(id=account_id)


# --- Ministry Routes ---

@router.get(
    "/ministries",
    response_model=ListObject[MinistryResponse],
    status_code=status.HTTP_200_OK,
    summary=docs.LIST_MINISTRIES_SUMMARY,
    description=docs.LIST_MINISTRIES_DESCRIPTION,
    responses=docs.LIST_MINISTRIES_RESPONSES,
)
async def list_ministries(
    db: Annotated[AsyncSession, Depends(get_db)],
    principal: Annotated[Principal, Depends(resolve_principal)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    starting_after: str | None = None,
    ending_before: str | None = None,
    search: str | None = None,
    include_deleted: bool = False,
) -> ListObject[MinistryResponse]:
    actual_include = include_deleted if principal.internal else False
    repo = DirectoryRepository(db)
    rows, has_more = await repo.list_ministries(
        limit=limit,
        starting_after=starting_after,
        ending_before=ending_before,
        include_deleted=actual_include,
        search=search,
    )
    return ListObject[MinistryResponse](
        data=[_serialize_ministry(r) for r in rows],
        has_more=has_more,
        url="/directory/ministries",
    )


@router.get(
    "/ministries/{ministry_id}",
    response_model=MinistryResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.RETRIEVE_MINISTRY_SUMMARY,
    description=docs.RETRIEVE_MINISTRY_DESCRIPTION,
    responses=docs.RETRIEVE_MINISTRY_RESPONSES,
)
async def retrieve_ministry(
    ministry_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    principal: Annotated[Principal, Depends(resolve_principal)],
    include_deleted: bool = False,
) -> MinistryResponse:
    actual_include = include_deleted if principal.internal else False
    repo = DirectoryRepository(db)
    ministry = await repo.get_ministry_by_id(ministry_id, include_deleted=actual_include)
    if not ministry:
        raise AppHTTPException(
            code="ministry/not-found",
            message="No ministry exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return _serialize_ministry(ministry)


@router.post(
    "/ministries",
    response_model=MinistryResponse,
    status_code=status.HTTP_201_CREATED,
    summary=docs.CREATE_MINISTRY_SUMMARY,
    description=docs.CREATE_MINISTRY_DESCRIPTION,
    responses=docs.CREATE_MINISTRY_RESPONSES,
)
async def create_ministry(
    _admin: AdminDep,
    body: MinistryCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MinistryResponse:
    repo = DirectoryRepository(db)
    ministry = await repo.create_ministry(**body.model_dump())
    return _serialize_ministry(ministry)


@router.patch(
    "/ministries/{ministry_id}",
    response_model=MinistryResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.UPDATE_MINISTRY_SUMMARY,
    description=docs.UPDATE_MINISTRY_DESCRIPTION,
    responses=docs.UPDATE_MINISTRY_RESPONSES,
)
async def update_ministry(
    ministry_id: str,
    _admin: AdminDep,
    body: MinistryUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MinistryResponse:
    repo = DirectoryRepository(db)
    ministry = await repo.get_ministry_by_id(ministry_id, include_deleted=True)
    if not ministry:
        raise AppHTTPException(
            code="ministry/not-found",
            message="No ministry exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    updated = await repo.update_ministry(ministry_id, **body.model_dump(exclude_unset=True))
    assert updated is not None
    return _serialize_ministry(updated)


@router.delete(
    "/ministries/{ministry_id}",
    response_model=MinistryDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.DELETE_MINISTRY_SUMMARY,
    description=docs.DELETE_MINISTRY_DESCRIPTION,
    responses=docs.DELETE_MINISTRY_RESPONSES,
)
async def delete_ministry(
    ministry_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    reason: str | None = None,
) -> MinistryDeleteResponse:
    repo = DirectoryRepository(db)
    deleted = await repo.delete_ministry(ministry_id, deleted_by=_admin.user_id, reason=reason)
    if not deleted:
        raise AppHTTPException(
            code="ministry/not-found",
            message="No ministry exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return MinistryDeleteResponse(id=ministry_id)


# --- MinistryDepartment Routes ---

@router.get(
    "/ministries/{ministry_id}/departments",
    response_model=ListObject[MinistryDepartmentResponse],
    status_code=status.HTTP_200_OK,
    summary=docs.LIST_MINISTRY_DEPARTMENTS_SUMMARY,
    description=docs.LIST_MINISTRY_DEPARTMENTS_DESCRIPTION,
    responses=docs.LIST_MINISTRY_DEPARTMENTS_RESPONSES,
)
async def list_ministry_departments(
    ministry_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    principal: Annotated[Principal, Depends(resolve_principal)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    starting_after: str | None = None,
    ending_before: str | None = None,
    include_deleted: bool = False,
) -> ListObject[MinistryDepartmentResponse]:
    actual_include = include_deleted if principal.internal else False
    repo = DirectoryRepository(db)
    rows, has_more = await repo.list_ministry_departments(
        ministry_id=ministry_id,
        limit=limit,
        starting_after=starting_after,
        ending_before=ending_before,
        include_deleted=actual_include,
    )
    return ListObject[MinistryDepartmentResponse](
        data=[_serialize_ministry_department(r) for r in rows],
        has_more=has_more,
        url=f"/directory/ministries/{ministry_id}/departments",
    )


@router.get(
    "/ministry-departments/{department_id}",
    response_model=MinistryDepartmentResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.RETRIEVE_MINISTRY_DEPARTMENT_SUMMARY,
    description=docs.RETRIEVE_MINISTRY_DEPARTMENT_DESCRIPTION,
    responses=docs.RETRIEVE_MINISTRY_DEPARTMENT_RESPONSES,
)
async def retrieve_ministry_department(
    department_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    principal: Annotated[Principal, Depends(resolve_principal)],
    include_deleted: bool = False,
) -> MinistryDepartmentResponse:
    actual_include = include_deleted if principal.internal else False
    repo = DirectoryRepository(db)
    dept = await repo.get_ministry_department_by_id(department_id, include_deleted=actual_include)
    if not dept:
        raise AppHTTPException(
            code="ministry_department/not-found",
            message="No ministry department exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return _serialize_ministry_department(dept)


@router.post(
    "/ministries/{ministry_id}/departments",
    response_model=MinistryDepartmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary=docs.CREATE_MINISTRY_DEPARTMENT_SUMMARY,
    description=docs.CREATE_MINISTRY_DEPARTMENT_DESCRIPTION,
    responses=docs.CREATE_MINISTRY_DEPARTMENT_RESPONSES,
)
async def create_ministry_department(
    ministry_id: str,
    _admin: AdminDep,
    body: MinistryDepartmentCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MinistryDepartmentResponse:
    repo = DirectoryRepository(db)
    ministry = await repo.get_ministry_by_id(ministry_id, include_deleted=True)
    if not ministry:
        raise AppHTTPException(
            code="ministry/not-found",
            message="No ministry exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    data = body.model_dump()
    address_data = data.pop("address")
    dept = await repo.create_ministry_department(ministry_id, address_data, **data)
    return _serialize_ministry_department(dept)


@router.patch(
    "/ministry-departments/{department_id}",
    response_model=MinistryDepartmentResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.UPDATE_MINISTRY_DEPARTMENT_SUMMARY,
    description=docs.UPDATE_MINISTRY_DEPARTMENT_DESCRIPTION,
    responses=docs.UPDATE_MINISTRY_DEPARTMENT_RESPONSES,
)
async def update_ministry_department(
    department_id: str,
    _admin: AdminDep,
    body: MinistryDepartmentUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MinistryDepartmentResponse:
    repo = DirectoryRepository(db)
    dept = await repo.get_ministry_department_by_id(department_id, include_deleted=True)
    if not dept:
        raise AppHTTPException(
            code="ministry_department/not-found",
            message="No ministry department exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    data = body.model_dump(exclude_unset=True)
    address_data = data.pop("address", None)
    updated = await repo.update_ministry_department(department_id, address_data, **data)
    assert updated is not None
    return _serialize_ministry_department(updated)


@router.delete(
    "/ministry-departments/{department_id}",
    response_model=MinistryDepartmentDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.DELETE_MINISTRY_DEPARTMENT_SUMMARY,
    description=docs.DELETE_MINISTRY_DEPARTMENT_DESCRIPTION,
    responses=docs.DELETE_MINISTRY_DEPARTMENT_RESPONSES,
)
async def delete_ministry_department(
    department_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    reason: str | None = None,
) -> MinistryDepartmentDeleteResponse:
    repo = DirectoryRepository(db)
    deleted = await repo.delete_ministry_department(department_id, deleted_by=_admin.user_id, reason=reason)
    if not deleted:
        raise AppHTTPException(
            code="ministry_department/not-found",
            message="No ministry department exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return MinistryDepartmentDeleteResponse(id=department_id)


# --- University Routes ---

@router.get(
    "/universities",
    response_model=ListObject[UniversityResponse],
    status_code=status.HTTP_200_OK,
    summary=docs.LIST_UNIVERSITIES_SUMMARY,
    description=docs.LIST_UNIVERSITIES_DESCRIPTION,
    responses=docs.LIST_UNIVERSITIES_RESPONSES,
)
async def list_universities(
    db: Annotated[AsyncSession, Depends(get_db)],
    principal: Annotated[Principal, Depends(resolve_principal)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    starting_after: str | None = None,
    ending_before: str | None = None,
    search: str | None = None,
    include_deleted: bool = False,
) -> ListObject[UniversityResponse]:
    actual_include = include_deleted if principal.internal else False
    repo = DirectoryRepository(db)
    rows, has_more = await repo.list_universities(
        limit=limit,
        starting_after=starting_after,
        ending_before=ending_before,
        include_deleted=actual_include,
        search=search,
    )
    return ListObject[UniversityResponse](
        data=[_serialize_university(r) for r in rows],
        has_more=has_more,
        url="/directory/universities",
    )


@router.get(
    "/universities/{university_id}",
    response_model=UniversityResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.RETRIEVE_UNIVERSITY_SUMMARY,
    description=docs.RETRIEVE_UNIVERSITY_SUMMARY,
    responses=docs.RETRIEVE_UNIVERSITY_RESPONSES,
)
async def retrieve_university(
    university_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    principal: Annotated[Principal, Depends(resolve_principal)],
    include_deleted: bool = False,
) -> UniversityResponse:
    actual_include = include_deleted if principal.internal else False
    repo = DirectoryRepository(db)
    uni = await repo.get_university_by_id(university_id, include_deleted=actual_include)
    if not uni:
        raise AppHTTPException(
            code="university/not-found",
            message="No university exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return _serialize_university(uni)


@router.post(
    "/universities",
    response_model=UniversityResponse,
    status_code=status.HTTP_201_CREATED,
    summary=docs.CREATE_UNIVERSITY_SUMMARY,
    description=docs.CREATE_UNIVERSITY_DESCRIPTION,
    responses=docs.CREATE_UNIVERSITY_RESPONSES,
)
async def create_university(
    _admin: AdminDep,
    body: UniversityCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UniversityResponse:
    repo = DirectoryRepository(db)
    uni = await repo.create_university(**body.model_dump())
    return _serialize_university(uni)


@router.patch(
    "/universities/{university_id}",
    response_model=UniversityResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.UPDATE_UNIVERSITY_SUMMARY,
    description=docs.UPDATE_UNIVERSITY_DESCRIPTION,
    responses=docs.UPDATE_UNIVERSITY_RESPONSES,
)
async def update_university(
    university_id: str,
    _admin: AdminDep,
    body: UniversityUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UniversityResponse:
    repo = DirectoryRepository(db)
    uni = await repo.get_university_by_id(university_id, include_deleted=True)
    if not uni:
        raise AppHTTPException(
            code="university/not-found",
            message="No university exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    updated = await repo.update_university(university_id, **body.model_dump(exclude_unset=True))
    assert updated is not None
    return _serialize_university(updated)


@router.delete(
    "/universities/{university_id}",
    response_model=UniversityDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.DELETE_UNIVERSITY_SUMMARY,
    description=docs.DELETE_UNIVERSITY_DESCRIPTION,
    responses=docs.DELETE_UNIVERSITY_RESPONSES,
)
async def delete_university(
    university_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    reason: str | None = None,
) -> UniversityDeleteResponse:
    repo = DirectoryRepository(db)
    deleted = await repo.delete_university(university_id, deleted_by=_admin.user_id, reason=reason)
    if not deleted:
        raise AppHTTPException(
            code="university/not-found",
            message="No university exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return UniversityDeleteResponse(id=university_id)


# --- UniversityCampus Routes ---

@router.get(
    "/universities/{university_id}/campuses",
    response_model=ListObject[UniversityCampusResponse],
    status_code=status.HTTP_200_OK,
    summary=docs.LIST_UNIVERSITY_CAMPUSES_SUMMARY,
    description=docs.LIST_UNIVERSITY_CAMPUSES_DESCRIPTION,
    responses=docs.LIST_UNIVERSITY_CAMPUSES_RESPONSES,
)
async def list_university_campuses(
    university_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    principal: Annotated[Principal, Depends(resolve_principal)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    starting_after: str | None = None,
    ending_before: str | None = None,
    include_deleted: bool = False,
) -> ListObject[UniversityCampusResponse]:
    actual_include = include_deleted if principal.internal else False
    repo = DirectoryRepository(db)
    rows, has_more = await repo.list_university_campuses(
        university_id=university_id,
        limit=limit,
        starting_after=starting_after,
        ending_before=ending_before,
        include_deleted=actual_include,
    )
    return ListObject[UniversityCampusResponse](
        data=[_serialize_university_campus(r) for r in rows],
        has_more=has_more,
        url=f"/directory/universities/{university_id}/campuses",
    )


@router.get(
    "/university-campuses/{campus_id}",
    response_model=UniversityCampusResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.RETRIEVE_UNIVERSITY_CAMPUS_SUMMARY,
    description=docs.RETRIEVE_UNIVERSITY_CAMPUS_DESCRIPTION,
    responses=docs.RETRIEVE_UNIVERSITY_CAMPUS_RESPONSES,
)
async def retrieve_university_campus(
    campus_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    principal: Annotated[Principal, Depends(resolve_principal)],
    include_deleted: bool = False,
) -> UniversityCampusResponse:
    actual_include = include_deleted if principal.internal else False
    repo = DirectoryRepository(db)
    campus = await repo.get_university_campus_by_id(campus_id, include_deleted=actual_include)
    if not campus:
        raise AppHTTPException(
            code="university_campus/not-found",
            message="No university campus exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return _serialize_university_campus(campus)


@router.post(
    "/universities/{university_id}/campuses",
    response_model=UniversityCampusResponse,
    status_code=status.HTTP_201_CREATED,
    summary=docs.CREATE_UNIVERSITY_CAMPUS_SUMMARY,
    description=docs.CREATE_UNIVERSITY_CAMPUS_DESCRIPTION,
    responses=docs.CREATE_UNIVERSITY_CAMPUS_RESPONSES,
)
async def create_university_campus(
    university_id: str,
    _admin: AdminDep,
    body: UniversityCampusCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UniversityCampusResponse:
    repo = DirectoryRepository(db)
    uni = await repo.get_university_by_id(university_id, include_deleted=True)
    if not uni:
        raise AppHTTPException(
            code="university/not-found",
            message="No university exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    data = body.model_dump()
    address_data = data.pop("address")
    campus = await repo.create_university_campus(university_id, address_data, **data)
    return _serialize_university_campus(campus)


@router.patch(
    "/university-campuses/{campus_id}",
    response_model=UniversityCampusResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.UPDATE_UNIVERSITY_CAMPUS_SUMMARY,
    description=docs.UPDATE_UNIVERSITY_CAMPUS_DESCRIPTION,
    responses=docs.UPDATE_UNIVERSITY_CAMPUS_RESPONSES,
)
async def update_university_campus(
    campus_id: str,
    _admin: AdminDep,
    body: UniversityCampusUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UniversityCampusResponse:
    repo = DirectoryRepository(db)
    campus = await repo.get_university_campus_by_id(campus_id, include_deleted=True)
    if not campus:
        raise AppHTTPException(
            code="university_campus/not-found",
            message="No university campus exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    data = body.model_dump(exclude_unset=True)
    address_data = data.pop("address", None)
    updated = await repo.update_university_campus(campus_id, address_data, **data)
    assert updated is not None
    return _serialize_university_campus(updated)


@router.delete(
    "/university-campuses/{campus_id}",
    response_model=UniversityCampusDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.DELETE_UNIVERSITY_CAMPUS_SUMMARY,
    description=docs.DELETE_UNIVERSITY_CAMPUS_DESCRIPTION,
    responses=docs.DELETE_UNIVERSITY_CAMPUS_RESPONSES,
)
async def delete_university_campus(
    campus_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    reason: str | None = None,
) -> UniversityCampusDeleteResponse:
    repo = DirectoryRepository(db)
    deleted = await repo.delete_university_campus(campus_id, deleted_by=_admin.user_id, reason=reason)
    if not deleted:
        raise AppHTTPException(
            code="university_campus/not-found",
            message="No university campus exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return UniversityCampusDeleteResponse(id=campus_id)


# --- SecondarySchool Routes ---

@router.get(
    "/schools",
    response_model=ListObject[SecondarySchoolResponse],
    status_code=status.HTTP_200_OK,
    summary=docs.LIST_SCHOOLS_SUMMARY,
    description=docs.LIST_SCHOOLS_DESCRIPTION,
    responses=docs.LIST_SCHOOLS_RESPONSES,
)
async def list_secondary_schools(
    db: Annotated[AsyncSession, Depends(get_db)],
    principal: Annotated[Principal, Depends(resolve_principal)],
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    starting_after: str | None = None,
    ending_before: str | None = None,
    search: str | None = None,
    parish: str | None = None,
    include_deleted: bool = False,
) -> ListObject[SecondarySchoolResponse]:
    actual_include = include_deleted if principal.internal else False
    repo = DirectoryRepository(db)
    rows, has_more = await repo.list_secondary_schools(
        limit=limit,
        starting_after=starting_after,
        ending_before=ending_before,
        include_deleted=actual_include,
        search=search,
        parish=parish,
    )
    return ListObject[SecondarySchoolResponse](
        data=[_serialize_secondary_school(r) for r in rows],
        has_more=has_more,
        url="/directory/schools",
    )


@router.get(
    "/schools/{school_id}",
    response_model=SecondarySchoolResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.RETRIEVE_SCHOOL_SUMMARY,
    description=docs.RETRIEVE_SCHOOL_DESCRIPTION,
    responses=docs.RETRIEVE_SCHOOL_RESPONSES,
)
async def retrieve_secondary_school(
    school_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    principal: Annotated[Principal, Depends(resolve_principal)],
    include_deleted: bool = False,
) -> SecondarySchoolResponse:
    actual_include = include_deleted if principal.internal else False
    repo = DirectoryRepository(db)
    school = await repo.get_secondary_school_by_id(school_id, include_deleted=actual_include)
    if not school:
        raise AppHTTPException(
            code="secondary_school/not-found",
            message="No secondary school exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return _serialize_secondary_school(school)


@router.post(
    "/schools",
    response_model=SecondarySchoolResponse,
    status_code=status.HTTP_201_CREATED,
    summary=docs.CREATE_SCHOOL_SUMMARY,
    description=docs.CREATE_SCHOOL_DESCRIPTION,
    responses=docs.CREATE_SCHOOL_RESPONSES,
)
async def create_secondary_school(
    _admin: AdminDep,
    body: SecondarySchoolCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SecondarySchoolResponse:
    repo = DirectoryRepository(db)
    data = body.model_dump()
    address_data = data.pop("address")
    school = await repo.create_secondary_school(address_data, **data)
    return _serialize_secondary_school(school)


@router.patch(
    "/schools/{school_id}",
    response_model=SecondarySchoolResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.UPDATE_SCHOOL_SUMMARY,
    description=docs.UPDATE_SCHOOL_DESCRIPTION,
    responses=docs.UPDATE_SCHOOL_RESPONSES,
)
async def update_secondary_school(
    school_id: str,
    _admin: AdminDep,
    body: SecondarySchoolUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SecondarySchoolResponse:
    repo = DirectoryRepository(db)
    school = await repo.get_secondary_school_by_id(school_id, include_deleted=True)
    if not school:
        raise AppHTTPException(
            code="secondary_school/not-found",
            message="No secondary school exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    data = body.model_dump(exclude_unset=True)
    address_data = data.pop("address", None)
    updated = await repo.update_secondary_school(school_id, address_data, **data)
    assert updated is not None
    return _serialize_secondary_school(updated)


@router.delete(
    "/schools/{school_id}",
    response_model=SecondarySchoolDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary=docs.DELETE_SCHOOL_SUMMARY,
    description=docs.DELETE_SCHOOL_DESCRIPTION,
    responses=docs.DELETE_SCHOOL_RESPONSES,
)
async def delete_secondary_school(
    school_id: str,
    _admin: AdminDep,
    db: Annotated[AsyncSession, Depends(get_db)],
    reason: str | None = None,
) -> SecondarySchoolDeleteResponse:
    repo = DirectoryRepository(db)
    deleted = await repo.delete_secondary_school(school_id, deleted_by=_admin.user_id, reason=reason)
    if not deleted:
        raise AppHTTPException(
            code="secondary_school/not-found",
            message="No secondary school exists with the provided identifier.",
            http_status_code=status.HTTP_404_NOT_FOUND,
        )
    return SecondarySchoolDeleteResponse(id=school_id)
