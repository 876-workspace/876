from typing import Any

LIST_CURRENCIES_SUMMARY = "List enabled currencies"
LIST_CURRENCIES_DESCRIPTION = "Returns all enabled currencies sorted by code."
LIST_CURRENCIES_RESPONSES: dict[int | str, dict[str, Any]] = {
    200: {"description": "Currencies returned."},
}

LIST_COUNTRIES_SUMMARY = "List enabled countries"
LIST_COUNTRIES_DESCRIPTION = "Returns all enabled countries sorted by name."
LIST_COUNTRIES_RESPONSES: dict[int | str, dict[str, Any]] = {
    200: {"description": "Countries returned."},
}

LIST_REGIONS_SUMMARY = "List regions for a country"
LIST_REGIONS_DESCRIPTION = "Returns enabled regions (parishes, states, etc.) for the given country code."
LIST_REGIONS_RESPONSES: dict[int | str, dict[str, Any]] = {
    200: {"description": "Regions returned."},
    404: {"description": "Country not found."},
}
