from typing import Any

APPROVE_VERIFICATION_SUMMARY = "Approve mobile number verification"
APPROVE_VERIFICATION_DESCRIPTION = "Checks a provider-owned code for the authenticated user's mobile number."
APPROVE_VERIFICATION_RESPONSES: dict[int | str, dict[str, Any]] = {200: {"description": "Verification approved."}}

CREATE_MOBILE_NUMBER_SUMMARY = "Create mobile number"
CREATE_MOBILE_NUMBER_DESCRIPTION = "Adds an E.164 mobile number to the authenticated user's account."
CREATE_MOBILE_NUMBER_RESPONSES: dict[int | str, dict[str, Any]] = {201: {"description": "Mobile number created."}}

CREATE_VERIFICATION_SUMMARY = "Send mobile number verification"
CREATE_VERIFICATION_DESCRIPTION = "Creates a provider-owned verification challenge for the user's mobile number."
CREATE_VERIFICATION_RESPONSES: dict[int | str, dict[str, Any]] = {201: {"description": "Verification sent."}}

DELETE_MOBILE_NUMBER_SUMMARY = "Delete mobile number"
DELETE_MOBILE_NUMBER_DESCRIPTION = "Deletes one of the authenticated user's mobile numbers."
DELETE_MOBILE_NUMBER_RESPONSES: dict[int | str, dict[str, Any]] = {200: {"description": "Mobile number deleted."}}

LIST_MOBILE_NUMBERS_SUMMARY = "List mobile numbers"
LIST_MOBILE_NUMBERS_DESCRIPTION = "Lists mobile numbers belonging to the authenticated user."
LIST_MOBILE_NUMBERS_RESPONSES: dict[int | str, dict[str, Any]] = {200: {"description": "Mobile numbers returned."}}

MAKE_PRIMARY_SUMMARY = "Make mobile number primary"
MAKE_PRIMARY_DESCRIPTION = "Makes a verified mobile number the user's primary number."
MAKE_PRIMARY_RESPONSES: dict[int | str, dict[str, Any]] = {200: {"description": "Primary number updated."}}

RETRIEVE_MOBILE_NUMBER_SUMMARY = "Retrieve mobile number"
RETRIEVE_MOBILE_NUMBER_DESCRIPTION = "Returns one mobile number belonging to the authenticated user."
RETRIEVE_MOBILE_NUMBER_RESPONSES: dict[int | str, dict[str, Any]] = {200: {"description": "Mobile number returned."}}

UPDATE_MOBILE_NUMBER_SUMMARY = "Update mobile number"
UPDATE_MOBILE_NUMBER_DESCRIPTION = "Updates metadata for one of the authenticated user's mobile numbers."
UPDATE_MOBILE_NUMBER_RESPONSES: dict[int | str, dict[str, Any]] = {200: {"description": "Mobile number updated."}}
