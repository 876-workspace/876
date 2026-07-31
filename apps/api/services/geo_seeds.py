"""Versioned geographic catalog seeding.

Countries and their first-level subdivisions are reference data every product
app depends on: ``organizations.region_id`` points at a region, and the courier
app resolves canonical region codes for every operational address it stores.

The catalog lives in ``data/geo/caribbean.json`` rather than inline SQL so a new
market can be added by editing data alone. It is validated before a single row
is written — a malformed catalog fails the bootstrap step loudly instead of
seeding a half-populated country list that surfaces later as a missing parish.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from sqlalchemy import text

from db.session import AsyncSessionLocal

CATALOG_PATH = Path(__file__).resolve().parent.parent / "data" / "geo" / "caribbean.json"

SCHEMA_VERSION = 1

# Jamaica's parishes and the US states/territories are the two datasets courier
# addresses cannot function without, so their completeness is asserted rather
# than left to review.
JAMAICA_PARISH_COUNT = 14
US_STATE_MINIMUM = 50

_UPSERT_COUNTRY = text("""
    INSERT INTO countries (code, name, phone_prefix, default_currency_code, is_enabled)
    VALUES (:code, :name, :phone_prefix, :default_currency_code, :is_enabled)
    ON CONFLICT (code) DO UPDATE SET
      name = EXCLUDED.name,
      phone_prefix = EXCLUDED.phone_prefix,
      default_currency_code = EXCLUDED.default_currency_code,
      is_enabled = EXCLUDED.is_enabled
""")

_UPSERT_REGION = text("""
    INSERT INTO regions (id, country_code, code, name, type, is_enabled)
    VALUES (:id, :country_code, :code, :name, :type, :is_enabled)
    ON CONFLICT (id) DO UPDATE SET
      country_code = EXCLUDED.country_code,
      code = EXCLUDED.code,
      name = EXCLUDED.name,
      type = EXCLUDED.type,
      is_enabled = EXCLUDED.is_enabled
""")


class GeoCatalogError(ValueError):
    """Raised when the bundled catalog is structurally invalid."""


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise GeoCatalogError(message)


def _validate_region(
    region: dict[str, Any],
    country_code: str,
    seen_ids: set[str],
    seen_codes: set[str],
) -> None:
    region_id = region.get("id")
    code = region.get("code")
    name = region.get("name")
    region_type = region.get("type")

    _require(bool(region_id), f"{country_code}: region is missing an id")
    _require(region_id not in seen_ids, f"duplicate region id {region_id!r}")
    seen_ids.add(str(region_id))

    _require(bool(code), f"{country_code}: region {region_id!r} is missing a code")
    _require(code not in seen_codes, f"{country_code}: duplicate region code {code!r}")
    seen_codes.add(str(code))

    _require(bool(name), f"{country_code}: region {region_id!r} is missing a name")
    _require(
        isinstance(region_type, str) and bool(region_type) and region_type.islower(),
        f"{country_code}: region {region_id!r} has an invalid type {region_type!r}",
    )


def validate_catalog(catalog: dict[str, Any]) -> None:
    """Reject a catalog that would seed incomplete or ambiguous geography."""
    _require(
        catalog.get("schema_version") == SCHEMA_VERSION,
        f"unsupported catalog schema_version {catalog.get('schema_version')!r}",
    )
    _require("catalog_revision" in catalog, "catalog is missing catalog_revision")

    countries = catalog.get("countries")
    _require(isinstance(countries, list) and bool(countries), "catalog has no countries")
    assert isinstance(countries, list)  # noqa: S101 - narrowing for type checkers

    seen_country_codes: set[str] = set()
    seen_region_ids: set[str] = set()
    parish_count = 0
    state_count = 0

    for country in countries:
        code = country.get("code")
        _require(
            isinstance(code, str) and len(code) == 2 and code.isupper(),
            f"invalid ISO 3166-1 alpha-2 country code {code!r}",
        )
        _require(code not in seen_country_codes, f"duplicate country code {code!r}")
        seen_country_codes.add(code)
        _require(bool(country.get("name")), f"{code}: country is missing a name")

        seen_region_codes: set[str] = set()
        for region in country.get("regions", []):
            _validate_region(region, code, seen_region_ids, seen_region_codes)

            if not region.get("is_enabled", True):
                continue
            if code == "JM" and region.get("type") == "parish":
                parish_count += 1
            if code == "US" and region.get("type") == "state":
                state_count += 1

    _require(
        parish_count == JAMAICA_PARISH_COUNT,
        f"Jamaica must have exactly {JAMAICA_PARISH_COUNT} enabled parishes, found {parish_count}",
    )
    _require(
        state_count >= US_STATE_MINIMUM,
        f"the United States must have at least {US_STATE_MINIMUM} enabled states, found {state_count}",
    )


def load_catalog(path: Path = CATALOG_PATH) -> dict[str, Any]:
    """Read and validate the bundled catalog."""
    with path.open(encoding="utf-8") as handle:
        catalog: dict[str, Any] = json.load(handle)

    validate_catalog(catalog)

    return catalog


async def seed_geo_catalog(_engine: object) -> None:
    """Upsert every catalog country and region.

    Idempotent and additive: rows are keyed by stable ids, and countries or
    regions already present that the catalog no longer lists are left alone
    rather than deleted, so an organization can never lose the region it
    references.
    """
    catalog = load_catalog()

    async with AsyncSessionLocal() as session:
        for country in catalog["countries"]:
            await session.execute(
                _UPSERT_COUNTRY,
                {
                    "code": country["code"],
                    "name": country["name"],
                    "phone_prefix": country.get("phone_prefix"),
                    "default_currency_code": country.get("default_currency_code"),
                    "is_enabled": country.get("is_enabled", True),
                },
            )

            for region in country.get("regions", []):
                await session.execute(
                    _UPSERT_REGION,
                    {
                        "id": region["id"],
                        "country_code": country["code"],
                        "code": region["code"],
                        "name": region["name"],
                        "type": region["type"],
                        "is_enabled": region.get("is_enabled", True),
                    },
                )

        await session.commit()
