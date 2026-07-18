# Console — Deferred Work

## Optional Fields Toggle Pattern

The create user form uses an eye-icon toggle to reveal an optional right-hand panel.
Apply the same pattern to the create org form (`org/new/create-org-form.tsx`) — optional
panel would contain: address fields (line1, line2, city, region, country), support_url.

## User Address Table

Users should support multiple addresses (billing, shipping, other).
Proposed schema: `user_addresses` table with columns:
id, user_id (FK → users), type (billing/shipping/other), label,
line1, line2, city, region_id (FK → regions), country_code (FK → countries),
postal_code, is_default, created_at, updated_at.

MC UI: address management panel on the user detail page.

## User Contacts Table

Users should be able to have multiple associated contacts (e.g. a business owner
managing contacts for their org). Proposed schema: `user_contacts` with columns:
id, user_id (FK → users), type (phone/email/other), label, value,
is_primary, created_at, updated_at.

## WorkOS Org Creation Flow

When MC creates an organization (`POST /organizations`), the API should also
create a corresponding organization in WorkOS and store the `workos_organization_id`.
Currently only the local DB record is created — the WorkOS client already has
`create_organization()` in `providers/workos/client.py`.
