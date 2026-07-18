PUBLISH_DRAFT_SUMMARY = "Publish a provisioning draft"
PUBLISH_DRAFT_DESCRIPTION = "Atomically archives the current published revision and promotes the validated draft."
REPLACE_DRAFT_SUMMARY = "Replace a provisioning draft"
REPLACE_DRAFT_DESCRIPTION = (
    "Creates or replaces the single mutable draft. Resource rows are validated against the code-owned catalog."
)
RETRIEVE_CATALOG_SUMMARY = "Retrieve provisioning resource definitions"
RETRIEVE_CATALOG_DESCRIPTION = (
    "Returns the code-owned resource and property shapes used by Console to render typed forms."
)
RETRIEVE_MANIFEST_SUMMARY = "Retrieve a provisioning manifest"
RETRIEVE_MANIFEST_DESCRIPTION = (
    "Returns the stable manifest identity with its current published and draft revisions. "
    "The manifest protocol version is permanently version 1."
)
RETRIEVE_PUBLISHED_SUMMARY = "Retrieve a published provisioning revision"
RETRIEVE_PUBLISHED_DESCRIPTION = "Returns the current immutable recipe used for new organization setup."
VALIDATE_DRAFT_SUMMARY = "Validate a provisioning draft"
VALIDATE_DRAFT_DESCRIPTION = "Validates a proposed recipe without changing control-plane data."
