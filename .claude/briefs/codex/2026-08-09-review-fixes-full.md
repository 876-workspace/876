# Brief — fix the four Codex review findings on couriers customers

PR #209 merged with four unresolved review findings. All four are real. Fix them.

Base branch: cut `fix/couriers-customer-review-findings` from an up-to-date
`origin/main` (which contains #209). Do not commit, branch, or push — the
orchestrator does that; just make the edits in the working tree.

**Do not touch** `apps/couriers/src/lib/manage/org-locations.ts`,
`apps/couriers/src/lib/service/org-locations/`,
`apps/couriers/src/lib/service/branches/`,
`apps/couriers/src/lib/service/warehouses/`, or
`apps/couriers/src/app/api/manage/{branches,warehouses}/` — a concurrent task
owns those and a conflict there will be discarded. **Do not touch
`apps/couriers-api/`** at all.

## Finding 1 (P1) — portal enrollment cannot revive a soft-deleted profile

`apps/couriers/src/lib/service/customer-profiles/ensure.ts`

Adding `deletedAt: null` to the lookup means that after a `CORE_USER` profile is
archived, portal enrollment no longer sees that row, tries to create a
replacement, and hits the `(tenantId, userId)` unique constraint. Enrollment for
that person is then permanently broken — they cannot get back into the portal.

Fix: look the profile up **without** the `deletedAt` filter. If the row exists
and is soft-deleted, **revive it** — clear `deletedAt`, `deletedBy`, and
`deletionReason`, set `updatedAt`, and keep its operational data (mailbox,
branch, TRN, commercial flag) exactly as it was. A returning customer keeps
their mailbox number; that is the whole reason the delete is soft.

Keep the existing guard that refuses to relink a profile to a different Billing
customer.

Tests in `ensure.test.ts`: a soft-deleted profile is revived rather than
recreated, `create` is never called, the tombstone columns are cleared, and the
mailbox is not reallocated.

## Finding 2 (P1) — the creation key is not stable across retries

`apps/couriers/src/lib/manage/customers.ts` and its callers

`generateId('CourierCustomerProfile')` runs on every request, so a retry after a
failed profile write produces a **new** profile id, therefore a new
`sourceExternalReference` and a new idempotency key. Billing creates a second
customer instead of reusing the orphan, which is the opposite of what the code
comment and `apps/couriers/docs/customers.md` both claim. Repeated transient
failures accumulate duplicate customers in the financial plane.

Fix: decouple the registry key from the profile id and let the **client** supply
it, so a retry of the same submission reuses the same key.

- Add an `idempotencyKey` field to `customerCreateParamsSchema`
  (`z.string().min(8).max(255)`), required.
- `createManagedCustomer` passes it to `createExternalCustomer` as **both** the
  `Idempotency-Key` and the `sourceExternalReference`
  (`couriers:create:<idempotencyKey>`). The profile id stays a normal generated
  id and no longer anchors anything.
- `customer-form.tsx` generates the key **once per submission attempt** —
  `useRef` holding `crypto.randomUUID()`, regenerated only after a **successful**
  create, so every retry of a failed submit reuses it.
- Update the comment in `createManagedCustomer` and the "Creating a customer"
  section of `apps/couriers/docs/customers.md` so both describe what the code
  now actually does.

Tests: two `createManagedCustomer` calls with the same `idempotencyKey` pass the
same key to `createExternalCustomer`; the profile id is not used as the key.

## Finding 3 (P1) — the stored phone is not parsed before being re-submitted

`apps/couriers/src/app/[orgSlug]/customers/_components/customer-form.tsx`

Editing a customer whose phone is stored as `+18765550142` initializes the
national-number input to the **whole** E.164 string while hard-coding the dial
code to `+1`. Saving then concatenates them into `+1+18765550142` and corrupts
the record.

Fix: split the stored value on load. Match it against the dial codes from
`listDialCodes()` (`@876/core/phone`), choosing the **longest** matching prefix —
`+1` and `+1876` both match a Jamaican number and the longer one is correct.
Put the remainder in the national-number field. A value that matches no dial
code keeps the app's default dial code and the raw remainder rather than
throwing.

Tests: a stored `+18765550142` renders as dial code `+1876` (or whatever
`listDialCodes()` actually yields for Jamaica — check, do not assume) with the
national part in the input, and saving without editing sends back exactly
`+18765550142`, unchanged.

## Finding 4 (P2) — cleared optional fields are silently ignored

Same file, the submit payload.

Clearing an existing email or phone yields `undefined`, `JSON.stringify` drops
the key, and the server treats the field as "not supplied" — so the value can
never be cleared through the UI.

Fix: send an explicit `null` when the field was populated and is now empty, and
keep omitting it when it was empty all along. Widen `customerUpdateParamsSchema`
to accept `null` for `email`, `phone`, `companyName`, `lastName`, and `trn`, and
make sure `updateManagedCustomer` and `service.customerProfiles.update` pass a
`null` through as a real clear rather than skipping it.

Do **not** make `firstName` (individual) or `companyName` (business) clearable —
they are the party's name and are required.

Tests: clearing an email sends `email: null` and the service writes `null`;
a field left untouched is still omitted entirely.

## Verify

```bash
cd /workspaces/876/apps/couriers
pnpm exec tsc --noEmit
pnpm exec eslint src
pnpm exec vitest run src/lib/service/customer-profiles src/lib/manage/customers.test.ts src/lib/finance "src/app/api/manage/customers" "src/app/[orgSlug]/customers"
```

If `pnpm` refuses to run because of an unrelated workspace dependency check, add
`--config.verifyDepsBeforeRun=false`.

Everything must pass. Report the real output; do not claim a check you did not
run.

---

## The raw reviewer comments, verbatim

### apps/couriers/src/app/[orgSlug]/customers/_components/customer-form.tsx:47

**<sub><sub>![P1 Badge](https://img.shields.io/badge/P1-orange?style=flat)</sub></sub>  Parse the stored phone before resubmitting it**

When editing an external customer whose phone is stored as `+18765550142`, this initializes the national-number field to the entire E.164 value while hard-coding `+1` as its dial code. Submitting even an unrelated edit therefore concatenates them into `+118765550142` and overwrites the registry with a corrupted phone number; split the stored value into its dial code and national number before initializing `PhoneInput`.

Useful? React with 👍 / 👎.

### apps/couriers/src/lib/service/customer-profiles/ensure.ts:25

**<sub><sub>![P1 Badge](https://img.shields.io/badge/P1-orange?style=flat)</sub></sub>  Allow portal enrollment to revive a deleted profile**

After a `CORE_USER` profile is soft-deleted, portal enrollment now ignores that row because of `deletedAt: null` and attempts to create a replacement. The unchanged unique constraints on `(tenantId, userId)` and `(tenantId, billingCustomerId)` still belong to the tombstone, so both enrollment attempts fail with a unique violation and ultimately report mailbox unavailability; revive the tombstone or change uniqueness to apply only to active profiles.

Useful? React with 👍 / 👎.

### apps/couriers/src/lib/manage/customers.ts:26

**<sub><sub>![P1 Badge](https://img.shields.io/badge/P1-orange?style=flat)</sub></sub>  Keep the creation key stable across request retries**

If Billing creates the registry customer but the subsequent local profile write fails, retrying the POST executes this line again and generates a different profile ID. The new ID produces a different `sourceExternalReference` and idempotency key, so Billing creates another customer rather than reusing the orphan as the comments and customer documentation claim, accumulating duplicate financial-plane customers after transient database failures.

Useful? React with 👍 / 👎.

### apps/couriers/src/app/[orgSlug]/customers/_components/customer-form.tsx:87

**<sub><sub>![P2 Badge](https://img.shields.io/badge/P2-yellow?style=flat)</sub></sub>  Send explicit clears for optional customer fields**

For an external customer with an existing email or phone, clearing either input converts the value to `undefined`; `JSON.stringify` then omits the key entirely, so the PATCH merge retains the old registry value while the UI reports success. The update contract needs an explicit nullable/clear representation rather than treating an emptied field as an omitted field.

Useful? React with 👍 / 👎.


## Work already applied by the orchestrator — verify, complete, and test it

Findings 1-4 have partial fixes in the working tree already: ensure.ts revives a soft-deleted profile; createExternalCustomer now takes idempotencyKey instead of profileId; customerCreateParamsSchema requires idempotencyKey; customer-form.tsx has splitPhone() plus a submissionKey useRef and a cleared() helper; customerUpdateParamsSchema accepts null for lastName/email/phone/trn.

Your job is to finish it: make updateManagedCustomer and service.customerProfiles.update pass an explicit null through as a real clear rather than skipping it, regenerate submissionKey after a successful create, update every existing test that referenced profileId, add the tests each finding names, update apps/couriers/docs/customers.md so the idempotency description matches the code, and get every check green.
