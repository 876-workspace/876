import pytest
from services.geo_seeds import validate_catalog

def test_validate_catalog_valid():
    catalog = {
        "schema_version": 1,
        "catalog_revision": 2,
        "countries": [
            {
                "code": "JM",
                "name": "Jamaica",
                "is_enabled": True,
                "regions": [
                    {"id": f"region_jm_{i:02d}", "code": f"{i:02d}", "name": "Parish", "type": "parish", "is_enabled": True} for i in range(1, 15)
                ]
            },
            {
                "code": "US",
                "name": "United States",
                "is_enabled": True,
                "regions": [
                    {"id": f"region_us_{i:02d}", "code": f"{i:02d}", "name": "State", "type": "state", "is_enabled": True} for i in range(1, 51)
                ]
            }
        ]
    }
    validate_catalog(catalog)

def test_validate_catalog_invalid_jm_parishes():
    catalog = {
        "schema_version": 1,
        "catalog_revision": 2,
        "countries": [
            {
                "code": "JM",
                "name": "Jamaica",
                "is_enabled": True,
                "regions": [
                    {"id": "region_jm_01", "code": "01", "name": "Parish", "type": "parish", "is_enabled": True}
                ]
            }
        ]
    }
    with pytest.raises(ValueError):
        validate_catalog(catalog)
