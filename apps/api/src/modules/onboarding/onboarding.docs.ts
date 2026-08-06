/**
 * OpenAPI prose for the Onboarding module. Pure data — this file imports nothing,
 * which is what keeps route files readable and documentation reviewable on its
 * own (.claude/rules/express-api.md).
 */

export const REPLACE_ANSWERS_SUMMARY = 'Replace onboarding answers'

export const REPLACE_ANSWERS_DESCRIPTION =
  'Atomically replaces the draft answer set. Submitted sessions move to `needs_update` until they are validated and submitted again. **Admin only.**'

export const RETRIEVE_CATALOG_SUMMARY = 'Retrieve onboarding catalog'

export const RETRIEVE_CATALOG_DESCRIPTION =
  'Returns the code-owned, country-aware form schema used to collect standardized organization or application onboarding information. **Admin only.**'

export const RETRIEVE_SESSION_SUMMARY = 'Retrieve onboarding session'

export const RETRIEVE_SESSION_DESCRIPTION =
  'Returns the current answer set for one organization and onboarding target. **Admin only.**'

export const SUBMIT_SESSION_SUMMARY = 'Submit onboarding session'

export const SUBMIT_SESSION_DESCRIPTION =
  'Locks and validates the saved answer set before marking it submitted. Submission does not itself provision product data; the provisioning orchestrator consumes it later. **Admin only.**'

export const VALIDATE_ANSWERS_SUMMARY = 'Validate onboarding answers'

export const VALIDATE_ANSWERS_DESCRIPTION =
  'Validates answers against the current country-aware catalog without saving them. **Admin only.**'
