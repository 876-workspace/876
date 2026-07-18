from fastapi import status

LIST_ADDRESSES_SUMMARY = "List addresses"
LIST_ADDRESSES_DESCRIPTION = "Returns addresses for a user or organization. Exactly one of `userId` or `organizationId` must be provided."
LIST_ADDRESSES_RESPONSES: dict[int | str, dict[str, object]] = {
    status.HTTP_200_OK: {"description": "Address list returned."},
    status.HTTP_400_BAD_REQUEST: {"description": "Neither or both owner params provided."},
}

CREATE_ADDRESS_SUMMARY = "Create address"
CREATE_ADDRESS_DESCRIPTION = "Creates a new address for a user or organization."
CREATE_ADDRESS_RESPONSES: dict[int | str, dict[str, object]] = {
    status.HTTP_201_CREATED: {"description": "Address created."},
    status.HTTP_400_BAD_REQUEST: {"description": "Invalid owner or address type."},
}

RETRIEVE_ADDRESS_SUMMARY = "Retrieve address"
RETRIEVE_ADDRESS_DESCRIPTION = "Retrieves a single address by ID."
RETRIEVE_ADDRESS_RESPONSES: dict[int | str, dict[str, object]] = {
    status.HTTP_200_OK: {"description": "Address returned."},
    status.HTTP_404_NOT_FOUND: {"description": "Address not found."},
}

UPDATE_ADDRESS_SUMMARY = "Update address"
UPDATE_ADDRESS_DESCRIPTION = "Updates an existing address."
UPDATE_ADDRESS_RESPONSES: dict[int | str, dict[str, object]] = {
    status.HTTP_200_OK: {"description": "Address updated."},
    status.HTTP_404_NOT_FOUND: {"description": "Address not found."},
}

DELETE_ADDRESS_SUMMARY = "Delete address"
DELETE_ADDRESS_DESCRIPTION = "Permanently deletes an address."
DELETE_ADDRESS_RESPONSES: dict[int | str, dict[str, object]] = {
    status.HTTP_200_OK: {"description": "Address deleted."},
    status.HTTP_404_NOT_FOUND: {"description": "Address not found."},
}
