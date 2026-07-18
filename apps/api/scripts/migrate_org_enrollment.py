"""
Migration: org enrollment fields, geo reference tables, and invite tokens.

Adds:
  - countries, regions, currencies reference tables
  - Organization: enrollment fields, contact/address columns, FK columns
  - invite_tokens table

Run once per environment:
    python scripts/migrate_org_enrollment.py

Idempotent — safe to run multiple times.
"""
# ruff: noqa: E402

from __future__ import annotations

import asyncio
import os
import sys

_api_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, _api_root)

from dotenv import load_dotenv

load_dotenv(os.path.join(_api_root, ".env.development"), override=False)
load_dotenv(os.path.join(_api_root, ".env"), override=False)

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# asyncpg requires each statement to be executed separately.
# Explicit phases to handle FK ordering: tables → seed → FK columns.

# Phase 1: Create reference tables (currencies must come before countries).
_DDL_PHASE1 = [
    """CREATE TABLE IF NOT EXISTS currencies (
        code           VARCHAR(3) PRIMARY KEY,
        name           VARCHAR    NOT NULL,
        symbol         VARCHAR    NOT NULL,
        decimal_places INTEGER    NOT NULL DEFAULT 2,
        is_enabled     BOOLEAN    NOT NULL DEFAULT true
    )""",
    """CREATE TABLE IF NOT EXISTS countries (
        code                  VARCHAR(2) PRIMARY KEY,
        name                  VARCHAR    NOT NULL,
        phone_prefix          VARCHAR,
        default_currency_code VARCHAR(3) REFERENCES currencies(code) ON DELETE SET NULL,
        is_enabled            BOOLEAN    NOT NULL DEFAULT true
    )""",
    """CREATE TABLE IF NOT EXISTS regions (
        id           VARCHAR    PRIMARY KEY,
        country_code VARCHAR(2) NOT NULL REFERENCES countries(code) ON DELETE CASCADE,
        code         VARCHAR    NOT NULL,
        name         VARCHAR    NOT NULL,
        type         VARCHAR    NOT NULL DEFAULT 'parish',
        is_enabled   BOOLEAN    NOT NULL DEFAULT true
    )""",
    "CREATE UNIQUE INDEX IF NOT EXISTS uq_regions_country_code ON regions (country_code, code)",
    """CREATE TABLE IF NOT EXISTS invite_tokens (
        id              VARCHAR NOT NULL PRIMARY KEY,
        organization_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        email           VARCHAR NOT NULL,
        role            VARCHAR NOT NULL DEFAULT 'member',
        token           VARCHAR NOT NULL UNIQUE,
        status          VARCHAR NOT NULL DEFAULT 'pending',
        expires_at      BIGINT  NOT NULL,
        created_at      BIGINT  NOT NULL,
        updated_at      BIGINT  NOT NULL
    )""",
]

# Phase 2: Alter organizations — columns that don't need currencies to exist yet.
_DDL_PHASE2 = [
    "ALTER TABLE organizations ALTER COLUMN name DROP NOT NULL",
    "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS primary_phone VARCHAR",
    "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS primary_email VARCHAR",
    "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS website_url VARCHAR",
    "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS support_url VARCHAR",
    "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS address_line1 VARCHAR",
    "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS address_line2 VARCHAR",
    "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS city VARCHAR",
    "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS region_id VARCHAR REFERENCES regions(id) ON DELETE SET NULL",
    "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS country_code"
    " VARCHAR(2) REFERENCES countries(code) ON DELETE SET NULL",
    "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS enrollment_completed_at BIGINT",
]

# Phase 4: currency_code FK column — must run AFTER seed data so DEFAULT 'JMD' resolves.
_DDL_PHASE4 = [
    "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS currency_code"
    " VARCHAR(3) DEFAULT 'JMD' REFERENCES currencies(code) ON DELETE SET NULL",
]

_CURRENCY_SEED = """
INSERT INTO currencies (code, name, symbol, decimal_places, is_enabled) VALUES
    ('JMD', 'Jamaican Dollar',   'J$', 2, true),
    ('USD', 'United States Dollar', '$', 2, true),
    ('GBP', 'British Pound',     '£',  2, true),
    ('EUR', 'Euro',              '€',  2, true),
    ('CAD', 'Canadian Dollar',   'CA$',2, true),
    ('TTD', 'Trinidad and Tobago Dollar', 'TT$', 2, true),
    ('BBD', 'Barbadian Dollar',  'Bds$',2, true)
ON CONFLICT (code) DO NOTHING;
"""

_COUNTRY_SEED = """
INSERT INTO countries (code, name, phone_prefix, default_currency_code, is_enabled) VALUES
    ('JM', 'Jamaica',                    '+1-876', 'JMD', true),
    ('US', 'United States',              '+1',     'USD', true),
    ('GB', 'United Kingdom',             '+44',    'GBP', true),
    ('CA', 'Canada',                     '+1',     'CAD', true),
    ('TT', 'Trinidad and Tobago',        '+1-868', 'TTD', true),
    ('BB', 'Barbados',                   '+1-246', 'BBD', true),
    ('GY', 'Guyana',                     '+592',   'USD', true),
    ('BS', 'Bahamas',                    '+1-242', 'USD', true),
    ('TC', 'Turks and Caicos Islands',   '+1-649', 'USD', true),
    ('KY', 'Cayman Islands',             '+1-345', 'USD', true),
    ('BM', 'Bermuda',                    '+1-441', 'USD', true),
    ('AG', 'Antigua and Barbuda',        '+1-268', 'USD', true),
    ('LC', 'Saint Lucia',                '+1-758', 'USD', true),
    ('VC', 'Saint Vincent and the Grenadines', '+1-784', 'USD', true),
    ('GD', 'Grenada',                    '+1-473', 'USD', true),
    ('DM', 'Dominica',                   '+1-767', 'USD', true),
    ('KN', 'Saint Kitts and Nevis',      '+1-869', 'USD', true)
ON CONFLICT (code) DO NOTHING;
"""

# Jamaica parishes with ISO 3166-2:JM codes
_JM_PARISH_SEED = """
INSERT INTO regions (id, country_code, code, name, type, is_enabled) VALUES
    ('region_jm_01', 'JM', 'JM-01', 'Kingston',       'parish', true),
    ('region_jm_02', 'JM', 'JM-02', 'St. Andrew',     'parish', true),
    ('region_jm_03', 'JM', 'JM-03', 'St. Thomas',     'parish', true),
    ('region_jm_04', 'JM', 'JM-04', 'Portland',       'parish', true),
    ('region_jm_05', 'JM', 'JM-05', 'St. Mary',       'parish', true),
    ('region_jm_06', 'JM', 'JM-06', 'St. Ann',        'parish', true),
    ('region_jm_07', 'JM', 'JM-07', 'Trelawny',       'parish', true),
    ('region_jm_08', 'JM', 'JM-08', 'St. James',      'parish', true),
    ('region_jm_09', 'JM', 'JM-09', 'Hanover',        'parish', true),
    ('region_jm_10', 'JM', 'JM-10', 'Westmoreland',   'parish', true),
    ('region_jm_11', 'JM', 'JM-11', 'St. Elizabeth',  'parish', true),
    ('region_jm_12', 'JM', 'JM-12', 'Manchester',     'parish', true),
    ('region_jm_13', 'JM', 'JM-13', 'Clarendon',      'parish', true),
    ('region_jm_14', 'JM', 'JM-14', 'St. Catherine',  'parish', true)
ON CONFLICT (id) DO NOTHING;
"""


def _build_engine_url(raw: str) -> tuple[str, dict]:
    url = raw
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    connect_args: dict = {}
    if "?" in url:
        base_url, query = url.split("?", 1)
        if "sslmode=require" in query or "ssl=require" in query:
            connect_args["ssl"] = True
        url = base_url
    return url, connect_args


_raw_db_url = os.environ.get("DATABASE_URL", "postgresql+asyncpg://localhost/876")
DATABASE_URL, _CONNECT_ARGS = _build_engine_url(_raw_db_url)


async def migrate() -> None:
    engine = create_async_engine(DATABASE_URL, echo=False, connect_args=_CONNECT_ARGS)

    async with engine.begin() as conn:
        print("Phase 1: Creating reference tables...")
        for stmt in _DDL_PHASE1:
            await conn.execute(text(stmt))
        print("✓ Reference tables ready")

        print("Phase 2: Altering organizations (non-FK columns)...")
        for stmt in _DDL_PHASE2:
            await conn.execute(text(stmt))
        print("✓ Organization columns added")

        print("Phase 3: Seeding reference data...")
        await conn.execute(text(_CURRENCY_SEED))
        await conn.execute(text(_COUNTRY_SEED))
        await conn.execute(text(_JM_PARISH_SEED))
        print("✓ Currencies, countries, and Jamaica parishes seeded")

        print("Phase 4: Adding currency_code FK column (requires seed)...")
        for stmt in _DDL_PHASE4:
            await conn.execute(text(stmt))
        print("✓ currency_code column added")

    await engine.dispose()
    print("\n✓ Migration complete.")


if __name__ == "__main__":
    asyncio.run(migrate())
