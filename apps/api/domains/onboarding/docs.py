REPLACE_ANSWERS_SUMMARY = "Replace onboarding answers"
REPLACE_ANSWERS_DESCRIPTION = (
    "Atomically replaces the draft answer set. Submitted sessions move to `needs_update` until they are "
    "validated and submitted again. **Admin only.**"
)
RETRIEVE_CATALOG_SUMMARY = "Retrieve onboarding catalog"
RETRIEVE_CATALOG_DESCRIPTION = (
    "Returns the code-owned, country-aware form schema used to collect standardized organization or "
    "application onboarding information. **Admin only.**"
)
RETRIEVE_SESSION_SUMMARY = "Retrieve onboarding session"
RETRIEVE_SESSION_DESCRIPTION = (
    "Returns the current answer set for one organization and onboarding target. **Admin only.**"
)
SUBMIT_SESSION_SUMMARY = "Submit onboarding session"
SUBMIT_SESSION_DESCRIPTION = (
    "Locks and validates the saved answer set before marking it submitted. Submission does not itself "
    "provision product data; the provisioning orchestrator consumes it later. **Admin only.**"
)
VALIDATE_ANSWERS_SUMMARY = "Validate onboarding answers"
VALIDATE_ANSWERS_DESCRIPTION = (
    "Validates answers against the current country-aware catalog without saving them. **Admin only.**"
)
