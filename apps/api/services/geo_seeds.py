import json
import os
from sqlalchemy import text
from sqlalchemy.engine import Engine

def validate_catalog(catalog):
    if catalog.get("schema_version") != 1 or "catalog_revision" not in catalog:
        raise ValueError("Invalid schema version or catalog revision")
    
    country_codes = set()
    region_ids = set()
    
    jm_parishes = 0
    us_states = 0
    
    for country in catalog.get("countries", []):
        code = country.get("code")
        name = country.get("name")
        if not code or len(code) != 2 or not code.isupper() or code in country_codes:
            raise ValueError(f"Invalid country code {code}")
        if not name:
            raise ValueError("Empty country name")
        country_codes.add(code)
        
        region_codes = set()
        for region in country.get("regions", []):
            rid = region.get("id")
            rcode = region.get("code")
            rname = region.get("name")
            rtype = region.get("type")
            
            if not rid or rid in region_ids:
                raise ValueError(f"Invalid globally unique region id {rid}")
            region_ids.add(rid)
            
            if not rcode or rcode in region_codes:
                raise ValueError(f"Invalid region code {rcode} for {code}")
            region_codes.add(rcode)
            
            if not rname or not rtype or not rtype.islower():
                raise ValueError("Invalid region name or type")
            
            if code == "JM" and region.get("is_enabled"): jm_parishes += 1
            if code == "US" and region.get("type") == "state" and region.get("is_enabled"): us_states += 1

    if jm_parishes != 14:
        raise ValueError("JM must have exactly 14 enabled parishes")
    if us_states < 50:
        raise ValueError("US must have at least 50 states")

async def seed_geo_catalog(engine: Engine):
    catalog_path = os.path.join(os.path.dirname(__file__), "..", "data", "geo", "caribbean.json")
    with open(catalog_path, "r") as f:
        catalog = json.load(f)
    
    validate_catalog(catalog)
    
    async with engine.begin() as conn:
        for country in catalog["countries"]:
            await conn.execute(text("""
                INSERT INTO countries (code, name, phone_prefix, default_currency_code, is_enabled)
                VALUES (:code, :name, :phone_prefix, :default_currency_code, :is_enabled)
                ON CONFLICT (code) DO UPDATE SET
                  name = EXCLUDED.name,
                  phone_prefix = EXCLUDED.phone_prefix,
                  default_currency_code = EXCLUDED.default_currency_code,
                  is_enabled = EXCLUDED.is_enabled
            """), {
                "code": country["code"],
                "name": country["name"],
                "phone_prefix": country.get("phone_prefix"),
                "default_currency_code": country.get("default_currency_code"),
                "is_enabled": country.get("is_enabled", True)
            })
            
            for region in country.get("regions", []):
                await conn.execute(text("""
                    INSERT INTO regions (id, country_code, code, name, type, is_enabled)
                    VALUES (:id, :country_code, :code, :name, :type, :is_enabled)
                    ON CONFLICT (id) DO UPDATE SET
                      code = EXCLUDED.code,
                      name = EXCLUDED.name,
                      type = EXCLUDED.type,
                      is_enabled = EXCLUDED.is_enabled
                """), {
                    "id": region["id"],
                    "country_code": country["code"],
                    "code": region["code"],
                    "name": region["name"],
                    "type": region["type"],
                    "is_enabled": region.get("is_enabled", True)
                })
