/**
 * OpenAPI prose for the Provisioning module. Pure data — this file imports nothing,
 * which is what keeps route files readable and documentation reviewable on its
 * own (.claude/rules/express-api.md).
 */

export const PUBLISH_DRAFT_SUMMARY = 'Publish a provisioning draft'

export const PUBLISH_DRAFT_DESCRIPTION =
  'Atomically archives the current published revision and promotes the fully validated draft.'

export const REPLACE_DRAFT_SUMMARY = 'Replace a provisioning draft'

export const REPLACE_DRAFT_DESCRIPTION =
  'Creates or replaces the single mutable draft. Operators may save an incomplete setup while authoring it across resource categories; schema and type errors are still rejected, and publication performs the complete catalog validation.'

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
  'Validates a proposed complete recipe without changing control-plane data.'

export const LIST_SETUPS_SUMMARY = 'List provisioning setups'

export const LIST_SETUPS_DESCRIPTION =
  'Returns every named day-zero configuration. Exactly one published setup is the platform default that new organizations are provisioned with.'

export const RETRIEVE_SETUP_SUMMARY = 'Retrieve a provisioning setup'

export const RETRIEVE_SETUP_DESCRIPTION =
  'Returns one setup with its finance manifest target, published revision, draft state, and the number of organizations provisioned with it.'

export const CREATE_SETUP_SUMMARY = 'Create a provisioning setup'

export const CREATE_SETUP_DESCRIPTION =
  'Creates a named setup with its own empty mutable finance draft so operators can build currencies, payment defaults, taxes, and other resources independently. copy_from may explicitly seed that draft from a published setup, but copying is never required and creation never publishes automatically.'

export const UPDATE_SETUP_SUMMARY = 'Update a provisioning setup'

export const UPDATE_SETUP_DESCRIPTION =
  'Renames a setup, edits its optional locale metadata, archives or reactivates it, or makes a published active setup the platform default. A default or in-use setup cannot be archived.'
