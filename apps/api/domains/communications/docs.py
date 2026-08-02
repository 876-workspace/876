from typing import Any

CREATE_MESSAGE_SUMMARY = "Create transactional message"
CREATE_MESSAGE_DESCRIPTION = "Sends a registered server-owned template over an enabled communications channel."
CREATE_MESSAGE_RESPONSES: dict[int | str, dict[str, Any]] = {201: {"description": "Message created."}}
CREATE_PHONE_LOOKUP_SUMMARY = "Look up a phone number"
CREATE_PHONE_LOOKUP_DESCRIPTION = "Validates and formats a phone number through the configured provider, using the cost-control cache."
CREATE_PHONE_LOOKUP_RESPONSES: dict[int | str, dict[str, Any]] = {200: {"description": "Phone lookup returned."}}
LIST_MESSAGES_SUMMARY = "List communications messages"
LIST_MESSAGES_DESCRIPTION = "Returns server-owned message delivery records without full bodies."
LIST_MESSAGES_RESPONSES: dict[int | str, dict[str, Any]] = {200: {"description": "Messages returned."}}
RETRIEVE_MESSAGE_SUMMARY = "Retrieve communications message"
RETRIEVE_MESSAGE_DESCRIPTION = "Returns a message delivery record without its full body."
RETRIEVE_MESSAGE_RESPONSES: dict[int | str, dict[str, Any]] = {200: {"description": "Message returned."}}
