from __future__ import annotations

import uuid
from collections.abc import Sequence
from typing import Any

from sqlalchemy import delete, select, update
from sqlalchemy.orm import selectinload
from sqlalchemy.sql.elements import ColumnElement

from core.deletion import deletion_values, should_soft_delete
from core.timestamps import now_unix_seconds
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
from db.repositories.base import BaseRepository


def generate_id(entity_type: str) -> str:
    prefixes = {
        "bank": "bank",
        "bank_branch": "bkbr",
        "credit_union": "cu",
        "credit_union_branch": "cubr",
        "bank_account": "bacct",
        "ministry": "min",
        "ministry_department": "mind",
        "university": "uni",
        "university_campus": "unic",
        "secondary_school": "school",
        "directory_address": "diraddr",
    }
    prefix = prefixes.get(entity_type)
    if not prefix:
        raise ValueError(f"Unknown entity type: {entity_type}")
    uuid_str = uuid.uuid4().hex
    return f"{prefix}_{uuid_str}"


class DirectoryRepository(BaseRepository):
    # --- Helper methods for DirectoryAddress ---

    async def _create_address(self, address_dict: dict[str, Any], now: int) -> str:
        addr_id = generate_id("directory_address")
        addr = DirectoryAddress(
            id=addr_id,
            line1=address_dict["line1"],
            line2=address_dict.get("line2"),
            city=address_dict["city"],
            state=address_dict["state"],
            postal_code=address_dict.get("postal_code"),
            country=address_dict.get("country", "JM"),
            latitude=address_dict["latitude"],
            longitude=address_dict["longitude"],
            created_at=now,
            updated_at=now,
        )
        self.db.add(addr)
        await self.db.flush()
        return addr_id

    async def _update_address(self, address_id: str, address_dict: dict[str, Any], now: int) -> None:
        stmt = (
            update(DirectoryAddress)
            .where(DirectoryAddress.id == address_id)
            .values(**address_dict, updated_at=now)
        )
        await self.db.execute(stmt)

    # --- Bank ---

    async def get_bank_by_id(self, bank_id: str, include_deleted: bool = False) -> Bank | None:
        bank = await self.db.get(Bank, bank_id)
        if bank is None:
            return None
        if not include_deleted and bank.deleted_at is not None:
            return None
        return bank

    async def get_bank_by_code(self, bank_code: str, include_deleted: bool = False) -> Bank | None:
        stmt = select(Bank).where(Bank.bank_code == bank_code)
        if not include_deleted:
            stmt = stmt.where(Bank.deleted_at.is_(None))
        return (await self.db.scalars(stmt)).first()

    async def create_bank(self, **kwargs: Any) -> Bank:
        now = now_unix_seconds()
        bank = Bank(
            id=generate_id("bank"),
            created_at=now,
            updated_at=now,
            **kwargs,
        )
        self.db.add(bank)
        await self.db.flush()
        await self.db.refresh(bank)
        return bank

    async def update_bank(self, bank_id: str, **kwargs: Any) -> Bank | None:
        now = now_unix_seconds()
        stmt = (
            update(Bank)
            .where(Bank.id == bank_id)
            .values(**kwargs, updated_at=now)
            .returning(Bank)
        )
        return (await self.db.scalars(stmt)).first()

    async def delete_bank(
        self,
        bank_id: str,
        deleted_by: str | None = None,
        reason: str | None = None,
    ) -> bool:
        stmt: Any
        if should_soft_delete():
            stmt = (
                update(Bank)
                .where(Bank.id == bank_id, Bank.deleted_at.is_(None))
                .values(**deletion_values(deleted_by, reason))
            )
        else:
            stmt = delete(Bank).where(Bank.id == bank_id)
        result = await self.db.execute(stmt)
        return bool(getattr(result, "rowcount", 0) > 0)

    async def list_banks(
        self,
        limit: int = 20,
        starting_after: str | None = None,
        ending_before: str | None = None,
        include_deleted: bool = False,
        search: str | None = None,
    ) -> tuple[Sequence[Bank], bool]:
        filters: list[ColumnElement[bool]] = []
        if not include_deleted:
            filters.append(Bank.deleted_at.is_(None))
        if search:
            pattern = f"%{search}%"
            filters.append(Bank.name.ilike(pattern))

        return await self.cursor_paginate_filtered(
            Bank,
            filters=filters,
            cursor_field="created_at",
            limit=limit,
            starting_after=starting_after,
            ending_before=ending_before,
        )

    # --- BankBranch ---

    async def get_branch_by_id(self, branch_id: str, include_deleted: bool = False) -> BankBranch | None:
        stmt = (
            select(BankBranch)
            .options(selectinload(BankBranch.address))
            .where(BankBranch.id == branch_id)
        )
        branch = (await self.db.scalars(stmt)).first()
        if branch is None:
            return None
        if not include_deleted and branch.deleted_at is not None:
            return None
        return branch

    async def create_branch(self, bank_id: str, address: dict[str, Any], **kwargs: Any) -> BankBranch:
        now = now_unix_seconds()
        address_id = await self._create_address(address, now)
        branch = BankBranch(
            id=generate_id("bank_branch"),
            bank_id=bank_id,
            address_id=address_id,
            created_at=now,
            updated_at=now,
            **kwargs,
        )
        self.db.add(branch)
        await self.db.flush()
        # Ensure address is loaded
        stmt = (
            select(BankBranch)
            .options(selectinload(BankBranch.address))
            .where(BankBranch.id == branch.id)
        )
        return (await self.db.scalars(stmt)).one()

    async def update_branch(
        self,
        branch_id: str,
        address: dict[str, Any] | None = None,
        **kwargs: Any,
    ) -> BankBranch | None:
        branch = await self.get_branch_by_id(branch_id, include_deleted=True)
        if not branch:
            return None
        now = now_unix_seconds()
        if address:
            await self._update_address(branch.address_id, address, now)
        stmt: Any
        if kwargs:
            stmt = (
                update(BankBranch)
                .where(BankBranch.id == branch_id)
                .values(**kwargs, updated_at=now)
                .returning(BankBranch)
            )
            branch = (await self.db.scalars(stmt)).first()
        else:
            branch.updated_at = now
            await self.db.flush()
        # Refresh relation
        stmt = (
            select(BankBranch)
            .options(selectinload(BankBranch.address))
            .where(BankBranch.id == branch_id)
        )
        return (await self.db.scalars(stmt)).first()

    async def delete_branch(
        self,
        branch_id: str,
        deleted_by: str | None = None,
        reason: str | None = None,
    ) -> bool:
        branch = await self.get_branch_by_id(branch_id, include_deleted=True)
        if not branch:
            return False

        stmt: Any
        if should_soft_delete():
            stmt = (
                update(BankBranch)
                .where(BankBranch.id == branch_id, BankBranch.deleted_at.is_(None))
                .values(**deletion_values(deleted_by, reason))
            )
            result = await self.db.execute(stmt)
            return bool(getattr(result, "rowcount", 0) > 0)
        else:
            address_id = branch.address_id
            stmt = delete(BankBranch).where(BankBranch.id == branch_id)
            result = await self.db.execute(stmt)
            stmt_addr = delete(DirectoryAddress).where(DirectoryAddress.id == address_id)
            await self.db.execute(stmt_addr)
            return bool(getattr(result, "rowcount", 0) > 0)

    async def list_branches(
        self,
        bank_id: str,
        limit: int = 20,
        starting_after: str | None = None,
        ending_before: str | None = None,
        include_deleted: bool = False,
    ) -> tuple[Sequence[BankBranch], bool]:
        filters: list[ColumnElement[bool]] = [BankBranch.bank_id == bank_id]
        if not include_deleted:
            filters.append(BankBranch.deleted_at.is_(None))

        # Re-implement cursor paginate to include selectinload
        col = BankBranch.created_at

        def base_stmt() -> Any:
            s = select(BankBranch).options(selectinload(BankBranch.address))
            for f in filters:
                s = s.where(f)
            return s

        if starting_after is not None:
            anchor = await self.db.get(BankBranch, starting_after)
            if anchor is None:
                return [], False
            cursor_val = anchor.created_at
            stmt = base_stmt().where(col < cursor_val).order_by(col.desc()).limit(limit + 1)
            rows = list((await self.db.scalars(stmt)).all())
            has_more = len(rows) > limit
            return rows[:limit], has_more

        if ending_before is not None:
            anchor = await self.db.get(BankBranch, ending_before)
            if anchor is None:
                return [], False
            cursor_val = anchor.created_at
            stmt = base_stmt().where(col > cursor_val).order_by(col.asc()).limit(limit + 1)
            rows = list((await self.db.scalars(stmt)).all())
            has_more = len(rows) > limit
            return list(reversed(rows[:limit])), has_more

        stmt = base_stmt().order_by(col.desc()).limit(limit + 1)
        rows = list((await self.db.scalars(stmt)).all())
        has_more = len(rows) > limit
        return rows[:limit], has_more

    # --- CreditUnion ---

    async def get_credit_union_by_id(self, cu_id: str, include_deleted: bool = False) -> CreditUnion | None:
        cu = await self.db.get(CreditUnion, cu_id)
        if cu is None:
            return None
        if not include_deleted and cu.deleted_at is not None:
            return None
        return cu

    async def create_credit_union(self, **kwargs: Any) -> CreditUnion:
        now = now_unix_seconds()
        cu = CreditUnion(
            id=generate_id("credit_union"),
            created_at=now,
            updated_at=now,
            **kwargs,
        )
        self.db.add(cu)
        await self.db.flush()
        await self.db.refresh(cu)
        return cu

    async def update_credit_union(self, cu_id: str, **kwargs: Any) -> CreditUnion | None:
        now = now_unix_seconds()
        stmt = (
            update(CreditUnion)
            .where(CreditUnion.id == cu_id)
            .values(**kwargs, updated_at=now)
            .returning(CreditUnion)
        )
        return (await self.db.scalars(stmt)).first()

    async def delete_credit_union(
        self,
        cu_id: str,
        deleted_by: str | None = None,
        reason: str | None = None,
    ) -> bool:
        stmt: Any
        if should_soft_delete():
            stmt = (
                update(CreditUnion)
                .where(CreditUnion.id == cu_id, CreditUnion.deleted_at.is_(None))
                .values(**deletion_values(deleted_by, reason))
            )
        else:
            stmt = delete(CreditUnion).where(CreditUnion.id == cu_id)
        result = await self.db.execute(stmt)
        return bool(getattr(result, "rowcount", 0) > 0)

    async def list_credit_unions(
        self,
        limit: int = 20,
        starting_after: str | None = None,
        ending_before: str | None = None,
        include_deleted: bool = False,
        search: str | None = None,
    ) -> tuple[Sequence[CreditUnion], bool]:
        filters: list[ColumnElement[bool]] = []
        if not include_deleted:
            filters.append(CreditUnion.deleted_at.is_(None))
        if search:
            pattern = f"%{search}%"
            filters.append(CreditUnion.name.ilike(pattern))

        return await self.cursor_paginate_filtered(
            CreditUnion,
            filters=filters,
            cursor_field="created_at",
            limit=limit,
            starting_after=starting_after,
            ending_before=ending_before,
        )

    # --- CreditUnionBranch ---

    async def get_credit_union_branch_by_id(
        self,
        branch_id: str,
        include_deleted: bool = False,
    ) -> CreditUnionBranch | None:
        stmt = (
            select(CreditUnionBranch)
            .options(selectinload(CreditUnionBranch.address))
            .where(CreditUnionBranch.id == branch_id)
        )
        branch = (await self.db.scalars(stmt)).first()
        if branch is None:
            return None
        if not include_deleted and branch.deleted_at is not None:
            return None
        return branch

    async def create_credit_union_branch(
        self,
        credit_union_id: str,
        address: dict[str, Any],
        **kwargs: Any,
    ) -> CreditUnionBranch:
        now = now_unix_seconds()
        address_id = await self._create_address(address, now)
        branch = CreditUnionBranch(
            id=generate_id("credit_union_branch"),
            credit_union_id=credit_union_id,
            address_id=address_id,
            created_at=now,
            updated_at=now,
            **kwargs,
        )
        self.db.add(branch)
        await self.db.flush()
        stmt = (
            select(CreditUnionBranch)
            .options(selectinload(CreditUnionBranch.address))
            .where(CreditUnionBranch.id == branch.id)
        )
        return (await self.db.scalars(stmt)).one()

    async def update_credit_union_branch(
        self,
        branch_id: str,
        address: dict[str, Any] | None = None,
        **kwargs: Any,
    ) -> CreditUnionBranch | None:
        branch = await self.get_credit_union_branch_by_id(branch_id, include_deleted=True)
        if not branch:
            return None
        now = now_unix_seconds()
        if address:
            await self._update_address(branch.address_id, address, now)
        stmt: Any
        if kwargs:
            stmt = (
                update(CreditUnionBranch)
                .where(CreditUnionBranch.id == branch_id)
                .values(**kwargs, updated_at=now)
                .returning(CreditUnionBranch)
            )
            branch = (await self.db.scalars(stmt)).first()
        else:
            branch.updated_at = now
            await self.db.flush()
        stmt = (
            select(CreditUnionBranch)
            .options(selectinload(CreditUnionBranch.address))
            .where(CreditUnionBranch.id == branch_id)
        )
        return (await self.db.scalars(stmt)).first()

    async def delete_credit_union_branch(
        self,
        branch_id: str,
        deleted_by: str | None = None,
        reason: str | None = None,
    ) -> bool:
        branch = await self.get_credit_union_branch_by_id(branch_id, include_deleted=True)
        if not branch:
            return False

        stmt: Any
        if should_soft_delete():
            stmt = (
                update(CreditUnionBranch)
                .where(CreditUnionBranch.id == branch_id, CreditUnionBranch.deleted_at.is_(None))
                .values(**deletion_values(deleted_by, reason))
            )
            result = await self.db.execute(stmt)
            return bool(getattr(result, "rowcount", 0) > 0)
        else:
            address_id = branch.address_id
            stmt = delete(CreditUnionBranch).where(CreditUnionBranch.id == branch_id)
            result = await self.db.execute(stmt)
            stmt_addr = delete(DirectoryAddress).where(DirectoryAddress.id == address_id)
            await self.db.execute(stmt_addr)
            return bool(getattr(result, "rowcount", 0) > 0)

    async def list_credit_union_branches(
        self,
        credit_union_id: str,
        limit: int = 20,
        starting_after: str | None = None,
        ending_before: str | None = None,
        include_deleted: bool = False,
    ) -> tuple[Sequence[CreditUnionBranch], bool]:
        filters: list[ColumnElement[bool]] = [CreditUnionBranch.credit_union_id == credit_union_id]
        if not include_deleted:
            filters.append(CreditUnionBranch.deleted_at.is_(None))

        col = CreditUnionBranch.created_at

        def base_stmt() -> Any:
            s = select(CreditUnionBranch).options(selectinload(CreditUnionBranch.address))
            for f in filters:
                s = s.where(f)
            return s

        if starting_after is not None:
            anchor = await self.db.get(CreditUnionBranch, starting_after)
            if anchor is None:
                return [], False
            cursor_val = anchor.created_at
            stmt = base_stmt().where(col < cursor_val).order_by(col.desc()).limit(limit + 1)
            rows = list((await self.db.scalars(stmt)).all())
            has_more = len(rows) > limit
            return rows[:limit], has_more

        if ending_before is not None:
            anchor = await self.db.get(CreditUnionBranch, ending_before)
            if anchor is None:
                return [], False
            cursor_val = anchor.created_at
            stmt = base_stmt().where(col > cursor_val).order_by(col.asc()).limit(limit + 1)
            rows = list((await self.db.scalars(stmt)).all())
            has_more = len(rows) > limit
            return list(reversed(rows[:limit])), has_more

        stmt = base_stmt().order_by(col.desc()).limit(limit + 1)
        rows = list((await self.db.scalars(stmt)).all())
        has_more = len(rows) > limit
        return rows[:limit], has_more

    # --- BankAccount ---

    async def get_bank_account_by_id(self, account_id: str, include_deleted: bool = False) -> BankAccount | None:
        account = await self.db.get(BankAccount, account_id)
        if account is None:
            return None
        if not include_deleted and account.deleted_at is not None:
            return None
        return account

    async def create_bank_account(self, **kwargs: Any) -> BankAccount:
        now = now_unix_seconds()
        account = BankAccount(
            id=generate_id("bank_account"),
            created_at=now,
            updated_at=now,
            **kwargs,
        )
        self.db.add(account)
        await self.db.flush()
        await self.db.refresh(account)
        return account

    async def update_bank_account(self, account_id: str, **kwargs: Any) -> BankAccount | None:
        now = now_unix_seconds()
        stmt = (
            update(BankAccount)
            .where(BankAccount.id == account_id)
            .values(**kwargs, updated_at=now)
            .returning(BankAccount)
        )
        return (await self.db.scalars(stmt)).first()

    async def delete_bank_account(
        self,
        account_id: str,
        deleted_by: str | None = None,
        reason: str | None = None,
    ) -> bool:
        stmt: Any
        if should_soft_delete():
            stmt = (
                update(BankAccount)
                .where(BankAccount.id == account_id, BankAccount.deleted_at.is_(None))
                .values(**deletion_values(deleted_by, reason))
            )
        else:
            stmt = delete(BankAccount).where(BankAccount.id == account_id)
        result = await self.db.execute(stmt)
        return bool(getattr(result, "rowcount", 0) > 0)

    async def list_bank_accounts(
        self,
        limit: int = 20,
        starting_after: str | None = None,
        ending_before: str | None = None,
        include_deleted: bool = False,
    ) -> tuple[Sequence[BankAccount], bool]:
        filters: list[ColumnElement[bool]] = []
        if not include_deleted:
            filters.append(BankAccount.deleted_at.is_(None))

        return await self.cursor_paginate_filtered(
            BankAccount,
            filters=filters,
            cursor_field="created_at",
            limit=limit,
            starting_after=starting_after,
            ending_before=ending_before,
        )

    # --- Ministry ---

    async def get_ministry_by_id(self, ministry_id: str, include_deleted: bool = False) -> Ministry | None:
        ministry = await self.db.get(Ministry, ministry_id)
        if ministry is None:
            return None
        if not include_deleted and ministry.deleted_at is not None:
            return None
        return ministry

    async def create_ministry(self, **kwargs: Any) -> Ministry:
        now = now_unix_seconds()
        ministry = Ministry(
            id=generate_id("ministry"),
            created_at=now,
            updated_at=now,
            **kwargs,
        )
        self.db.add(ministry)
        await self.db.flush()
        await self.db.refresh(ministry)
        return ministry

    async def update_ministry(self, ministry_id: str, **kwargs: Any) -> Ministry | None:
        now = now_unix_seconds()
        stmt = (
            update(Ministry)
            .where(Ministry.id == ministry_id)
            .values(**kwargs, updated_at=now)
            .returning(Ministry)
        )
        return (await self.db.scalars(stmt)).first()

    async def delete_ministry(
        self,
        ministry_id: str,
        deleted_by: str | None = None,
        reason: str | None = None,
    ) -> bool:
        stmt: Any
        if should_soft_delete():
            stmt = (
                update(Ministry)
                .where(Ministry.id == ministry_id, Ministry.deleted_at.is_(None))
                .values(**deletion_values(deleted_by, reason))
            )
        else:
            stmt = delete(Ministry).where(Ministry.id == ministry_id)
        result = await self.db.execute(stmt)
        return bool(getattr(result, "rowcount", 0) > 0)

    async def list_ministries(
        self,
        limit: int = 20,
        starting_after: str | None = None,
        ending_before: str | None = None,
        include_deleted: bool = False,
        search: str | None = None,
    ) -> tuple[Sequence[Ministry], bool]:
        filters: list[ColumnElement[bool]] = []
        if not include_deleted:
            filters.append(Ministry.deleted_at.is_(None))
        if search:
            pattern = f"%{search}%"
            filters.append(Ministry.name.ilike(pattern))

        return await self.cursor_paginate_filtered(
            Ministry,
            filters=filters,
            cursor_field="created_at",
            limit=limit,
            starting_after=starting_after,
            ending_before=ending_before,
        )

    # --- MinistryDepartment ---

    async def get_ministry_department_by_id(
        self,
        department_id: str,
        include_deleted: bool = False,
    ) -> MinistryDepartment | None:
        stmt = (
            select(MinistryDepartment)
            .options(selectinload(MinistryDepartment.address))
            .where(MinistryDepartment.id == department_id)
        )
        department = (await self.db.scalars(stmt)).first()
        if department is None:
            return None
        if not include_deleted and department.deleted_at is not None:
            return None
        return department

    async def create_ministry_department(
        self,
        ministry_id: str,
        address: dict[str, Any],
        **kwargs: Any,
    ) -> MinistryDepartment:
        now = now_unix_seconds()
        address_id = await self._create_address(address, now)
        department = MinistryDepartment(
            id=generate_id("ministry_department"),
            ministry_id=ministry_id,
            address_id=address_id,
            created_at=now,
            updated_at=now,
            **kwargs,
        )
        self.db.add(department)
        await self.db.flush()
        stmt = (
            select(MinistryDepartment)
            .options(selectinload(MinistryDepartment.address))
            .where(MinistryDepartment.id == department.id)
        )
        return (await self.db.scalars(stmt)).one()

    async def update_ministry_department(
        self,
        department_id: str,
        address: dict[str, Any] | None = None,
        **kwargs: Any,
    ) -> MinistryDepartment | None:
        department = await self.get_ministry_department_by_id(department_id, include_deleted=True)
        if not department:
            return None
        now = now_unix_seconds()
        if address:
            await self._update_address(department.address_id, address, now)
        stmt: Any
        if kwargs:
            stmt = (
                update(MinistryDepartment)
                .where(MinistryDepartment.id == department_id)
                .values(**kwargs, updated_at=now)
                .returning(MinistryDepartment)
            )
            department = (await self.db.scalars(stmt)).first()
        else:
            department.updated_at = now
            await self.db.flush()
        stmt = (
            select(MinistryDepartment)
            .options(selectinload(MinistryDepartment.address))
            .where(MinistryDepartment.id == department_id)
        )
        return (await self.db.scalars(stmt)).first()

    async def delete_ministry_department(
        self,
        department_id: str,
        deleted_by: str | None = None,
        reason: str | None = None,
    ) -> bool:
        department = await self.get_ministry_department_by_id(department_id, include_deleted=True)
        if not department:
            return False

        stmt: Any
        if should_soft_delete():
            stmt = (
                update(MinistryDepartment)
                .where(MinistryDepartment.id == department_id, MinistryDepartment.deleted_at.is_(None))
                .values(**deletion_values(deleted_by, reason))
            )
            result = await self.db.execute(stmt)
            return bool(getattr(result, "rowcount", 0) > 0)
        else:
            address_id = department.address_id
            stmt = delete(MinistryDepartment).where(MinistryDepartment.id == department_id)
            result = await self.db.execute(stmt)
            stmt_addr = delete(DirectoryAddress).where(DirectoryAddress.id == address_id)
            await self.db.execute(stmt_addr)
            return bool(getattr(result, "rowcount", 0) > 0)

    async def list_ministry_departments(
        self,
        ministry_id: str,
        limit: int = 20,
        starting_after: str | None = None,
        ending_before: str | None = None,
        include_deleted: bool = False,
    ) -> tuple[Sequence[MinistryDepartment], bool]:
        filters: list[ColumnElement[bool]] = [MinistryDepartment.ministry_id == ministry_id]
        if not include_deleted:
            filters.append(MinistryDepartment.deleted_at.is_(None))

        col = MinistryDepartment.created_at

        def base_stmt() -> Any:
            s = select(MinistryDepartment).options(selectinload(MinistryDepartment.address))
            for f in filters:
                s = s.where(f)
            return s

        if starting_after is not None:
            anchor = await self.db.get(MinistryDepartment, starting_after)
            if anchor is None:
                return [], False
            cursor_val = anchor.created_at
            stmt = base_stmt().where(col < cursor_val).order_by(col.desc()).limit(limit + 1)
            rows = list((await self.db.scalars(stmt)).all())
            has_more = len(rows) > limit
            return rows[:limit], has_more

        if ending_before is not None:
            anchor = await self.db.get(MinistryDepartment, ending_before)
            if anchor is None:
                return [], False
            cursor_val = anchor.created_at
            stmt = base_stmt().where(col > cursor_val).order_by(col.asc()).limit(limit + 1)
            rows = list((await self.db.scalars(stmt)).all())
            has_more = len(rows) > limit
            return list(reversed(rows[:limit])), has_more

        stmt = base_stmt().order_by(col.desc()).limit(limit + 1)
        rows = list((await self.db.scalars(stmt)).all())
        has_more = len(rows) > limit
        return rows[:limit], has_more

    # --- University ---

    async def get_university_by_id(self, university_id: str, include_deleted: bool = False) -> University | None:
        university = await self.db.get(University, university_id)
        if university is None:
            return None
        if not include_deleted and university.deleted_at is not None:
            return None
        return university

    async def create_university(self, **kwargs: Any) -> University:
        now = now_unix_seconds()
        university = University(
            id=generate_id("university"),
            created_at=now,
            updated_at=now,
            **kwargs,
        )
        self.db.add(university)
        await self.db.flush()
        await self.db.refresh(university)
        return university

    async def update_university(self, university_id: str, **kwargs: Any) -> University | None:
        now = now_unix_seconds()
        stmt = (
            update(University)
            .where(University.id == university_id)
            .values(**kwargs, updated_at=now)
            .returning(University)
        )
        return (await self.db.scalars(stmt)).first()

    async def delete_university(
        self,
        university_id: str,
        deleted_by: str | None = None,
        reason: str | None = None,
    ) -> bool:
        stmt: Any
        if should_soft_delete():
            stmt = (
                update(University)
                .where(University.id == university_id, University.deleted_at.is_(None))
                .values(**deletion_values(deleted_by, reason))
            )
        else:
            stmt = delete(University).where(University.id == university_id)
        result = await self.db.execute(stmt)
        return bool(getattr(result, "rowcount", 0) > 0)

    async def list_universities(
        self,
        limit: int = 20,
        starting_after: str | None = None,
        ending_before: str | None = None,
        include_deleted: bool = False,
        search: str | None = None,
    ) -> tuple[Sequence[University], bool]:
        filters: list[ColumnElement[bool]] = []
        if not include_deleted:
            filters.append(University.deleted_at.is_(None))
        if search:
            pattern = f"%{search}%"
            filters.append(University.name.ilike(pattern))

        return await self.cursor_paginate_filtered(
            University,
            filters=filters,
            cursor_field="created_at",
            limit=limit,
            starting_after=starting_after,
            ending_before=ending_before,
        )

    # --- UniversityCampus ---

    async def get_university_campus_by_id(
        self,
        campus_id: str,
        include_deleted: bool = False,
    ) -> UniversityCampus | None:
        stmt = (
            select(UniversityCampus)
            .options(selectinload(UniversityCampus.address))
            .where(UniversityCampus.id == campus_id)
        )
        campus = (await self.db.scalars(stmt)).first()
        if campus is None:
            return None
        if not include_deleted and campus.deleted_at is not None:
            return None
        return campus

    async def create_university_campus(
        self,
        university_id: str,
        address: dict[str, Any],
        **kwargs: Any,
    ) -> UniversityCampus:
        now = now_unix_seconds()
        address_id = await self._create_address(address, now)
        campus = UniversityCampus(
            id=generate_id("university_campus"),
            university_id=university_id,
            address_id=address_id,
            created_at=now,
            updated_at=now,
            **kwargs,
        )
        self.db.add(campus)
        await self.db.flush()
        stmt = (
            select(UniversityCampus)
            .options(selectinload(UniversityCampus.address))
            .where(UniversityCampus.id == campus.id)
        )
        return (await self.db.scalars(stmt)).one()

    async def update_university_campus(
        self,
        campus_id: str,
        address: dict[str, Any] | None = None,
        **kwargs: Any,
    ) -> UniversityCampus | None:
        campus = await self.get_university_campus_by_id(campus_id, include_deleted=True)
        if not campus:
            return None
        now = now_unix_seconds()
        if address:
            await self._update_address(campus.address_id, address, now)
        stmt: Any
        if kwargs:
            stmt = (
                update(UniversityCampus)
                .where(UniversityCampus.id == campus_id)
                .values(**kwargs, updated_at=now)
                .returning(UniversityCampus)
            )
            (await self.db.scalars(stmt)).first()
        else:
            campus.updated_at = now
            await self.db.flush()
        stmt = (
            select(UniversityCampus)
            .options(selectinload(UniversityCampus.address))
            .where(UniversityCampus.id == campus_id)
        )
        return (await self.db.scalars(stmt)).first()

    async def delete_university_campus(
        self,
        campus_id: str,
        deleted_by: str | None = None,
        reason: str | None = None,
    ) -> bool:
        campus = await self.get_university_campus_by_id(campus_id, include_deleted=True)
        if not campus:
            return False

        stmt: Any
        if should_soft_delete():
            stmt = (
                update(UniversityCampus)
                .where(UniversityCampus.id == campus_id, UniversityCampus.deleted_at.is_(None))
                .values(**deletion_values(deleted_by, reason))
            )
            result = await self.db.execute(stmt)
            return bool(getattr(result, "rowcount", 0) > 0)
        else:
            address_id = campus.address_id
            stmt = delete(UniversityCampus).where(UniversityCampus.id == campus_id)
            result = await self.db.execute(stmt)
            stmt_addr = delete(DirectoryAddress).where(DirectoryAddress.id == address_id)
            await self.db.execute(stmt_addr)
            return bool(getattr(result, "rowcount", 0) > 0)

    async def list_university_campuses(
        self,
        university_id: str,
        limit: int = 20,
        starting_after: str | None = None,
        ending_before: str | None = None,
        include_deleted: bool = False,
    ) -> tuple[Sequence[UniversityCampus], bool]:
        filters: list[ColumnElement[bool]] = [UniversityCampus.university_id == university_id]
        if not include_deleted:
            filters.append(UniversityCampus.deleted_at.is_(None))

        col = UniversityCampus.created_at

        def base_stmt() -> Any:
            s = select(UniversityCampus).options(selectinload(UniversityCampus.address))
            for f in filters:
                s = s.where(f)
            return s

        if starting_after is not None:
            anchor = await self.db.get(UniversityCampus, starting_after)
            if anchor is None:
                return [], False
            cursor_val = anchor.created_at
            stmt = base_stmt().where(col < cursor_val).order_by(col.desc()).limit(limit + 1)
            rows = list((await self.db.scalars(stmt)).all())
            has_more = len(rows) > limit
            return rows[:limit], has_more

        if ending_before is not None:
            anchor = await self.db.get(UniversityCampus, ending_before)
            if anchor is None:
                return [], False
            cursor_val = anchor.created_at
            stmt = base_stmt().where(col > cursor_val).order_by(col.asc()).limit(limit + 1)
            rows = list((await self.db.scalars(stmt)).all())
            has_more = len(rows) > limit
            return list(reversed(rows[:limit])), has_more

        stmt = base_stmt().order_by(col.desc()).limit(limit + 1)
        rows = list((await self.db.scalars(stmt)).all())
        has_more = len(rows) > limit
        return rows[:limit], has_more

    # --- SecondarySchool ---

    async def get_secondary_school_by_id(
        self,
        school_id: str,
        include_deleted: bool = False,
    ) -> SecondarySchool | None:
        stmt = (
            select(SecondarySchool)
            .options(selectinload(SecondarySchool.address))
            .where(SecondarySchool.id == school_id)
        )
        school = (await self.db.scalars(stmt)).first()
        if school is None:
            return None
        if not include_deleted and school.deleted_at is not None:
            return None
        return school

    async def create_secondary_school(self, address: dict[str, Any], **kwargs: Any) -> SecondarySchool:
        now = now_unix_seconds()
        address_id = await self._create_address(address, now)
        school = SecondarySchool(
            id=generate_id("secondary_school"),
            address_id=address_id,
            created_at=now,
            updated_at=now,
            **kwargs,
        )
        self.db.add(school)
        await self.db.flush()
        stmt = (
            select(SecondarySchool)
            .options(selectinload(SecondarySchool.address))
            .where(SecondarySchool.id == school.id)
        )
        return (await self.db.scalars(stmt)).one()

    async def update_secondary_school(
        self,
        school_id: str,
        address: dict[str, Any] | None = None,
        **kwargs: Any,
    ) -> SecondarySchool | None:
        school = await self.get_secondary_school_by_id(school_id, include_deleted=True)
        if not school:
            return None
        now = now_unix_seconds()
        if address:
            await self._update_address(school.address_id, address, now)
        stmt: Any
        if kwargs:
            stmt = (
                update(SecondarySchool)
                .where(SecondarySchool.id == school_id)
                .values(**kwargs, updated_at=now)
                .returning(SecondarySchool)
            )
            (await self.db.scalars(stmt)).first()
        else:
            school.updated_at = now
            await self.db.flush()
        stmt = (
            select(SecondarySchool)
            .options(selectinload(SecondarySchool.address))
            .where(SecondarySchool.id == school_id)
        )
        return (await self.db.scalars(stmt)).first()

    async def delete_secondary_school(
        self,
        school_id: str,
        deleted_by: str | None = None,
        reason: str | None = None,
    ) -> bool:
        school = await self.get_secondary_school_by_id(school_id, include_deleted=True)
        if not school:
            return False

        stmt: Any
        if should_soft_delete():
            stmt = (
                update(SecondarySchool)
                .where(SecondarySchool.id == school_id, SecondarySchool.deleted_at.is_(None))
                .values(**deletion_values(deleted_by, reason))
            )
            result = await self.db.execute(stmt)
            return bool(getattr(result, "rowcount", 0) > 0)
        else:
            address_id = school.address_id
            stmt = delete(SecondarySchool).where(SecondarySchool.id == school_id)
            result = await self.db.execute(stmt)
            stmt_addr = delete(DirectoryAddress).where(DirectoryAddress.id == address_id)
            await self.db.execute(stmt_addr)
            return bool(getattr(result, "rowcount", 0) > 0)

    async def list_secondary_schools(
        self,
        limit: int = 20,
        starting_after: str | None = None,
        ending_before: str | None = None,
        include_deleted: bool = False,
        search: str | None = None,
        parish: str | None = None,
    ) -> tuple[Sequence[SecondarySchool], bool]:
        filters: list[ColumnElement[bool]] = []
        if not include_deleted:
            filters.append(SecondarySchool.deleted_at.is_(None))
        if search:
            pattern = f"%{search}%"
            filters.append(SecondarySchool.name.ilike(pattern))
        if parish:
            filters.append(SecondarySchool.address.has(DirectoryAddress.state == parish))

        col = SecondarySchool.created_at

        def base_stmt() -> Any:
            s = select(SecondarySchool).options(selectinload(SecondarySchool.address))
            for f in filters:
                s = s.where(f)
            return s

        if starting_after is not None:
            anchor = await self.db.get(SecondarySchool, starting_after)
            if anchor is None:
                return [], False
            cursor_val = anchor.created_at
            stmt = base_stmt().where(col < cursor_val).order_by(col.desc()).limit(limit + 1)
            rows = list((await self.db.scalars(stmt)).all())
            has_more = len(rows) > limit
            return rows[:limit], has_more

        if ending_before is not None:
            anchor = await self.db.get(SecondarySchool, ending_before)
            if anchor is None:
                return [], False
            cursor_val = anchor.created_at
            stmt = base_stmt().where(col > cursor_val).order_by(col.asc()).limit(limit + 1)
            rows = list((await self.db.scalars(stmt)).all())
            has_more = len(rows) > limit
            return list(reversed(rows[:limit])), has_more

        stmt = base_stmt().order_by(col.desc()).limit(limit + 1)
        rows = list((await self.db.scalars(stmt)).all())
        has_more = len(rows) > limit
        return rows[:limit], has_more
