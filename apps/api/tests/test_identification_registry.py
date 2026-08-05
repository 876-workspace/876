"""The identification registry and its database CHECK constraint must agree.

These are two independent lists of the same thing. If they drift, the API
accepts a type the database then rejects — a 500 on a write that passed every
validation layer above it. This test is the only thing keeping them in step.
"""

from __future__ import annotations

import re

import pytest

from core.identifications import (
    IDENTIFICATION_TYPES,
    is_valid_identification_value,
    normalize_identification_value,
)
from db.models.users import UserIdentification


def _constraint_types() -> set[str]:
    for constraint in UserIdentification.__table__.constraints:
        if getattr(constraint, "name", None) == "user_identifications_type_check":
            return set(re.findall(r"'([a-z_]+)'", str(constraint.sqltext)))
    raise AssertionError("user_identifications_type_check is missing from the model")


class TestRegistryConstraintParity:
    def test_every_registry_type_is_allowed_by_the_constraint(self) -> None:
        assert set(IDENTIFICATION_TYPES) <= _constraint_types()

    def test_the_constraint_allows_no_type_the_registry_lacks(self) -> None:
        assert _constraint_types() <= set(IDENTIFICATION_TYPES)


class TestRegistryShape:
    @pytest.mark.parametrize("identification_type", sorted(IDENTIFICATION_TYPES))
    def test_every_type_has_a_label_and_a_compilable_pattern(self, identification_type: str) -> None:
        config = IDENTIFICATION_TYPES[identification_type]

        assert config.label
        re.compile(config.pattern)

    @pytest.mark.parametrize("identification_type", sorted(IDENTIFICATION_TYPES))
    def test_every_key_is_lower_snake_case(self, identification_type: str) -> None:
        assert re.fullmatch(r"[a-z][a-z0-9_]*", identification_type)

    def test_a_new_type_is_not_disclosable_by_default(self) -> None:
        """Types added without a product need must not be disclosable.

        Disclosure is the one path that returns a raw identifier, so the
        allowlist has to be earned per type rather than inherited.
        """
        for identification_type in ("voters_id", "nis", "tax_id", "work_permit"):
            assert IDENTIFICATION_TYPES[identification_type].disclosure_app_slugs == frozenset()


class TestNewTypeValidation:
    @pytest.mark.parametrize(
        ("identification_type", "raw", "normalized"),
        [
            ("national_id", "ab-12345", "AB12345"),
            ("voters_id", "vt 998877", "VT998877"),
            ("nis", "nis-44556", "NIS44556"),
            ("tax_id", "tx-778899", "TX778899"),
            ("work_permit", "wp 123456", "WP123456"),
        ],
    )
    def test_normalizes_and_accepts_a_realistic_value(
        self, identification_type: str, raw: str, normalized: str
    ) -> None:
        result = normalize_identification_value(identification_type, raw)

        assert result == normalized
        assert is_valid_identification_value(identification_type, result)

    @pytest.mark.parametrize("identification_type", ["national_id", "voters_id", "nis", "tax_id", "work_permit"])
    def test_rejects_a_value_that_is_too_short(self, identification_type: str) -> None:
        assert not is_valid_identification_value(identification_type, "AB1")
