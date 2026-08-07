/**
 * OpenAPI prose for the Provisioning module. Pure data — this file imports nothing,
 * which is what keeps route files readable and documentation reviewable on its
 * own (.claude/rules/express-api.md).
 */

export const PUBLISH_DRAFT_SUMMARY = 'Publish a provisioning draft'

export const PUBLISH_DRAFT_DESCRIPTION =
  'Atomically archives the current published revision and promotes the validated draft.'

export const REPLACE_DRAFT_SUMMARY = 'Replace a provisioning draft'

export const REPLACE_DRAFT_DESCRIPTION =
  'Creates or replaces the single mutable draft. Resource rows are validated against the code-owned catalog.'

export const RETRIEVE_CATALOG_SUMMARY =
  'Retrieve provisioning resource definitions'

export const RETRIEVE_CATALOG_DESCRIPTION =
  'Returns the code-owned resource and property shapes used by Console to render typed forms.'

export const RETRIEVE_MANIFEST_SUMMARY = 'Retrieve a provisioning manifest'

export const RETRIEVE_MANIFEST_DESCRIPTION =
  'Returns the stable manifest identity with its current published and draft revisions. The manifest protocol version is permanently version 1.'

export const RETRIEVE_PUBLISHED_SUMMARY =
  'Retrieve a published provisioning revision'

export const RETRIEVE_PUBLISHED_DESCRIPTION =
  'Returns the current immutable recipe used for new organization setup.'

export const VALIDATE_DRAFT_SUMMARY = 'Validate a provisioning draft'

export const VALIDATE_DRAFT_DESCRIPTION =
  'Validates a proposed recipe without changing control-plane data.'
