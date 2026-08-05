from typing import Any

LIST_DEVICES_SUMMARY = "List devices"
LIST_DEVICES_DESCRIPTION = "Lists derived device identities captured during authentication."
LIST_DEVICES_RESPONSES: dict[int | str, dict[str, Any]] = {}
RETRIEVE_DEVICE_SUMMARY = "Retrieve a device"
RETRIEVE_DEVICE_DESCRIPTION = "Retrieves one derived device identity."
RETRIEVE_DEVICE_RESPONSES: dict[int | str, dict[str, Any]] = {}
UPDATE_DEVICE_SUMMARY = "Update a device"
UPDATE_DEVICE_DESCRIPTION = "Updates a device label, trust, or block status."
UPDATE_DEVICE_RESPONSES: dict[int | str, dict[str, Any]] = {}
LIST_DEVICE_ATTEMPTS_SUMMARY = "List device attempts"
LIST_DEVICE_ATTEMPTS_DESCRIPTION = "Lists authentication attempts for a device."
LIST_DEVICE_ATTEMPTS_RESPONSES: dict[int | str, dict[str, Any]] = {}
LIST_DEVICE_USERS_SUMMARY = "List device users"
LIST_DEVICE_USERS_DESCRIPTION = "Lists accounts observed on the same fingerprint."
LIST_DEVICE_USERS_RESPONSES: dict[int | str, dict[str, Any]] = {}
