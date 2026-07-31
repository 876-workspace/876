"""Integrity coverage for the bundled geographic catalog.

The catalog is data, so the only thing standing between a typo and a courier
tenant that cannot select its parish is validation. These tests assert both
that the shipped catalog is sound and that each individual rule actually
rejects the malformed shape it claims to.
"""

from __future__ import annotations

import copy
from typing import Any

import pytest

from services.geo_seeds import (
    JAMAICA_PARISH_COUNT,
    US_STATE_MINIMUM,
    GeoCatalogError,
    load_catalog,
    validate_catalog,
)


def _region(index: int, country: str, region_type: str) -> dict[str, Any]:
    return {
        "id": f"region_{country.lower()}_{index:02d}",
        "code": f"{country}-{index:02d}",
        "name": f"Region {index}",
        "type": region_type,
        "is_enabled": True,
    }


def _catalog() -> dict[str, Any]:
    """A minimal catalog that satisfies every rule."""
    return {
        "schema_version": 1,
        "catalog_revision": 2,
        "countries": [
            {
                "code": "JM",
                "name": "Jamaica",
                "phone_prefix": "+1-876",
                "default_currency_code": "JMD",
                "is_enabled": True,
                "regions": [_region(i, "JM", "parish") for i in range(1, JAMAICA_PARISH_COUNT + 1)],
            },
            {
                "code": "US",
                "name": "United States",
                "is_enabled": True,
                "regions": [_region(i, "US", "state") for i in range(1, US_STATE_MINIMUM + 1)],
            },
        ],
    }


class TestBundledCatalog:
    def test_bundled_catalog_is_valid(self) -> None:
        catalog = load_catalog()

        assert catalog["schema_version"] == 1
        assert catalog["countries"]

    def test_bundled_catalog_has_all_jamaican_parishes(self) -> None:
        catalog = load_catalog()
        jamaica = next(c for c in catalog["countries"] if c["code"] == "JM")
        parishes = [r for r in jamaica["regions"] if r["type"] == "parish"]

        assert len(parishes) == JAMAICA_PARISH_COUNT

    def test_bundled_catalog_preserves_stable_jamaican_region_ids(self) -> None:
        """``organizations.region_id`` already points at these ids."""
        catalog = load_catalog()
        jamaica = next(c for c in catalog["countries"] if c["code"] == "JM")
        ids = {r["id"] for r in jamaica["regions"]}

        expected = {f"region_jm_{i:02d}" for i in range(1, JAMAICA_PARISH_COUNT + 1)}
        assert expected <= ids

    def test_bundled_catalog_covers_us_states(self) -> None:
        catalog = load_catalog()
        us = next(c for c in catalog["countries"] if c["code"] == "US")
        states = [r for r in us["regions"] if r["type"] == "state" and r["is_enabled"]]

        assert len(states) >= US_STATE_MINIMUM


class TestValidateCatalog:
    def test_accepts_a_well_formed_catalog(self) -> None:
        validate_catalog(_catalog())

    def test_rejects_an_unsupported_schema_version(self) -> None:
        catalog = _catalog()
        catalog["schema_version"] = 2

        with pytest.raises(GeoCatalogError, match="schema_version"):
            validate_catalog(catalog)

    def test_rejects_a_missing_catalog_revision(self) -> None:
        catalog = _catalog()
        del catalog["catalog_revision"]

        with pytest.raises(GeoCatalogError, match="catalog_revision"):
            validate_catalog(catalog)

    def test_rejects_an_empty_country_list(self) -> None:
        catalog = _catalog()
        catalog["countries"] = []

        with pytest.raises(GeoCatalogError, match="no countries"):
            validate_catalog(catalog)

    @pytest.mark.parametrize("code", ["J", "JAM", "jm", "", None])
    def test_rejects_an_invalid_country_code(self, code: Any) -> None:
        catalog = _catalog()
        catalog["countries"][1]["code"] = code

        with pytest.raises(GeoCatalogError, match="country code"):
            validate_catalog(catalog)

    def test_rejects_a_duplicate_country_code(self) -> None:
        catalog = _catalog()
        catalog["countries"][1]["code"] = "JM"

        with pytest.raises(GeoCatalogError, match="duplicate country code"):
            validate_catalog(catalog)

    def test_rejects_a_country_without_a_name(self) -> None:
        catalog = _catalog()
        catalog["countries"][0]["name"] = ""

        with pytest.raises(GeoCatalogError, match="missing a name"):
            validate_catalog(catalog)

    def test_rejects_a_duplicate_region_id_across_countries(self) -> None:
        catalog = _catalog()
        catalog["countries"][1]["regions"][0]["id"] = "region_jm_01"

        with pytest.raises(GeoCatalogError, match="duplicate region id"):
            validate_catalog(catalog)

    def test_rejects_a_duplicate_region_code_within_a_country(self) -> None:
        catalog = _catalog()
        catalog["countries"][0]["regions"][1]["code"] = catalog["countries"][0]["regions"][0]["code"]

        with pytest.raises(GeoCatalogError, match="duplicate region code"):
            validate_catalog(catalog)

    def test_rejects_a_region_without_a_name(self) -> None:
        catalog = _catalog()
        catalog["countries"][0]["regions"][0]["name"] = ""

        with pytest.raises(GeoCatalogError, match="missing a name"):
            validate_catalog(catalog)

    @pytest.mark.parametrize("region_type", ["Parish", "PARISH", "", None])
    def test_rejects_an_invalid_region_type(self, region_type: Any) -> None:
        catalog = _catalog()
        catalog["countries"][0]["regions"][0]["type"] = region_type

        with pytest.raises(GeoCatalogError, match="invalid type"):
            validate_catalog(catalog)

    def test_rejects_too_few_jamaican_parishes(self) -> None:
        catalog = _catalog()
        catalog["countries"][0]["regions"].pop()

        with pytest.raises(GeoCatalogError, match="14 enabled parishes"):
            validate_catalog(catalog)

    def test_rejects_too_many_jamaican_parishes(self) -> None:
        catalog = _catalog()
        catalog["countries"][0]["regions"].append(_region(99, "JM", "parish"))

        with pytest.raises(GeoCatalogError, match="14 enabled parishes"):
            validate_catalog(catalog)

    def test_does_not_count_a_disabled_parish(self) -> None:
        catalog = _catalog()
        catalog["countries"][0]["regions"][0]["is_enabled"] = False

        with pytest.raises(GeoCatalogError, match="14 enabled parishes"):
            validate_catalog(catalog)

    def test_rejects_too_few_us_states(self) -> None:
        catalog = _catalog()
        catalog["countries"][1]["regions"].pop()

        with pytest.raises(GeoCatalogError, match="50 enabled states"):
            validate_catalog(catalog)

    def test_does_not_mutate_the_catalog_it_validates(self) -> None:
        catalog = _catalog()
        snapshot = copy.deepcopy(catalog)

        validate_catalog(catalog)

        assert catalog == snapshot
