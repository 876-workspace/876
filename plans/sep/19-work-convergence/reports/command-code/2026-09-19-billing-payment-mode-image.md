# Billing `payment.schema` — the stale fixture was wrong, not the contract

- **Run ID:** `19-work-convergence`
- **Brief:** `plans/sep/19-work-convergence/briefs/command-code/2026-09-19-billing-payment-mode-image.md`
- **Branch:** `refactor/work-convergence`
- **Status:** complete. Two failing tests fixed; no commit, branch, or PR.
- **Scope of diff:** `packages/billing/src/types/__tests__/payment.schema.test.ts` only.

## 1. Verdict

**The fixture was wrong.** The Zod contract in
`packages/billing/src/types/payment-mode.schema.ts` (imported by
`payment.schema.ts`) already mirrors the server exactly — both image fields are
required and nullable. The failing fixture in
`packages/billing/src/types/__tests__/payment.schema.test.ts` predates the image
fields and omits two keys the server always emits, so it no longer describes a
real payment-mode resource.

No schema file was changed. Adding `.optional()` to the contract would not have
mirrored the serializer: the server never omits these keys, so it would have
weakened the schema to make a stale fixture pass.

## 2. The serializer evidence

`apps/billing-api/src/modules/payments/payments.serializers.ts`, the only
payment-mode serializer in the service (`serializePaymentMode`, used by
`listModes` / `getMode` / `createMode` / `updateMode` and by
`serializePayment` for the nested `payment.paymentMode`):

```ts
export function serializePaymentMode(row: unknown) {
  const data = record(json(row))
  return {
    object: 'payment_mode' as const,
    id: data.id,
    name: data.name,
    isDefault: data.isDefault,
    isActive: data.isActive,
    isSystem: data.isSystem,
    imageFileId: data.imageFileId ?? null,
    imageUrl: data.imageUrl ?? null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}
```

Deciding lines (30–31):

```ts
imageFileId: data.imageFileId ?? null,
imageUrl: data.imageUrl ?? null,
```

These sit in an unconditional object literal, so **the two keys are always
present**; the values are `string | null`, never omitted and never `undefined`.
That is the `required + .nullable()` shape the contract already expresses:

```ts
imageFileId: z.string().startsWith('file_').nullable(),
imageUrl: z.url().nullable(),
```

Supporting evidence, same conclusion:

- `apps/billing-api/prisma/schema/payment-mode.prisma` — the columns are
  nullable (`imageFileId String? @map("image_file_id")`,
  `imageUrl String? @map("image_url")`), so a mode with no logo legitimately
  serializes both as `null`.
- `apps/billing-api/src/modules/payments/schemas/payment.ts:171-172` — the
  server's own public resource type is `imageFileId: string | null` /
  `imageUrl: string | null` (present, nullable).
- `apps/billing-api/src/modules/payments/__tests__/payments.serializers.test.ts:171-179`
  asserts `serializePaymentMode(row.paymentMode)` equals
  `{ …, imageFileId: null, imageUrl: null, … }` for the same "Bank transfer"
  mode (`mode_1`) the failing fixture models.
- `apps/billing-api/src/modules/payments/payments.mode-responses.test.ts`
  expects the same nulls on create/update responses.

## 3. Why the fixture, and the history that proves it

The fixture was introduced by `8f2f61d9a` (_test(billing): lock refunded
payment schema_, Sep 8) — before payment-mode images existed. The contract and
every other fixture were updated by `5a28911f4` (_feat(billing-sdk): orchestrate
payment mode image uploads_, Sep 14, "Tests fixtures carry the new fields"),
which added the two nullable columns to the schemas and added
`imageFileId: null, imageUrl: null` to:

- `packages/billing/src/integration/client.test.ts` (+2 lines)
- `packages/billing/src/integration/resources/__tests__/payments.integration.test.ts` (+2 lines, the same `pay_1` / `mode_1` / "Bank transfer" payment fixture)
- `packages/billing/src/integration/resources/__tests__/payment-modes-tax.integration.test.ts`
- `packages/billing/src/integration/types/payment-mode.schema.ts` (contract mirror)

`src/types/__tests__/payment.schema.test.ts` was missed. This report applies
exactly the correction that commit made to the sibling fixtures. `null` is the
realistic value here because the mode is an image-less "Bank transfer": it is
precisely what the serializer emits for that row, and it is what the server's
own serializer test expects. No value was invented for the fixture.

The `.nullable()` (not `.optional()`) reading also matches how the package
mirrors the serializer elsewhere in `PaymentSchema`: `refunds` and
`bankTransaction` are `.optional()` because `serializePayment` conditionally
omits them, while `referenceNumber` / `notes` are plain `.nullable()` because
the serializer always emits them. `imageFileId` / `imageUrl` behave like the
latter.

## 4. Exact diff

```diff
diff --git a/packages/billing/src/types/__tests__/payment.schema.test.ts b/packages/billing/src/types/__tests__/payment.schema.test.ts
index 99dfc08cd..8f2b712ce 100644
--- a/packages/billing/src/types/__tests__/payment.schema.test.ts
+++ b/packages/billing/src/types/__tests__/payment.schema.test.ts
@@ -25,6 +25,8 @@ const payment = {
     isDefault: true,
     isActive: true,
     isSystem: false,
+    imageFileId: null,
+    imageUrl: null,
     createdAt: 1,
     updatedAt: 1,
   },
```

Nothing else changed: no schema edit, no field rename or re-spelling, no
`eslint-disable`, `@ts-ignore`, `as any`, or `.passthrough()`, no database
command.

## 5. Verification

Run in the foreground, one at a time.

```
$ pnpm --filter @876/billing typecheck
$ tsc --noEmit
[exit 0 — no output]
```

```
$ pnpm --filter @876/billing test

 RUN  v4.1.11 /root/projects/876/packages/billing

 Test Files  48 passed (48)
      Tests  443 passed (443)
   Start at  12:10:19
   Duration  9.60s
```

Before the fix the same suite reported `2 failed | 441 passed (443)` in
`src/types/__tests__/payment.schema.test.ts`, exactly the two named tests. After
the fix: **443 passed, 0 failed**, as required.

`pnpm --filter @876/billing-api typecheck` was not run: `apps/billing-api` was
read but not changed, and the brief scopes that command to a billing-api diff.
Its five pre-existing `documents.service.assessLateFees` /
`documents.service.chaos` failures are untouched and not part of this result.

Final status:

```
 M packages/billing/src/types/__tests__/payment.schema.test.ts
```

## 6. What could not be verified

- **No live HTTP response was captured.** The decision rests on the serializer
  source, the Prisma column nullability, the server's own resource type, and its
  serializer/route tests — not on a running Billing API. No database command was
  run, per the brief.
- **The billing-api suite was not executed.** The workspace was not modified, so
  its pre-existing failures were neither confirmed nor touched.
- `pnpm check` (repo-wide format/lint/typecheck/test) was not run; only the
  package-scoped verifications the brief requested.
