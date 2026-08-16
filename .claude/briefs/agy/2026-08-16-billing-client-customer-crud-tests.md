# Brief — test the four new customer verbs on `@876/billing`

Repo: `/root/projects/876`. **Do not commit, do not branch, do not push.**
Create exactly one file and change nothing else.

## Context

`packages/billing/src/resources/customers.ts` just gained four verbs — `list`,
`retrieve`, `update`, `delete` — and they have no tests. Everything else in this
brief already exists and works; do not modify it.

Read these before writing:

- `packages/billing/src/resources/customers.ts` — the verbs under test.
- `packages/billing/src/client.test.ts` — **copy its style exactly**: a
  `vi.fn<typeof fetch>()` mock returning `Response.json({ data, error: null })`,
  a client built with `create876Client({ baseUrl, fetch: fetchMock })`, then
  assertions on both the returned result and the exact `fetch` arguments.
- `packages/billing/src/types/customer.ts` — the `Customer` shape your fixtures
  must satisfy.
- `.claude/rules/testing.md` — the rules below are drawn from it; follow it.

## Create `packages/billing/src/resources/customers.test.ts`

A top-level `describe('customers resource', ...)` with nested describes per verb.

### Fixture

Write a local `createCustomer(overrides: Partial<Customer> = {}): Customer`
factory inside the file (no shared fixture file, per the testing rules) with
realistic domain defaults — a Jamaican business customer, `status: 'ACTIVE'`,
`defaultCurrency: 'JMD'`, `outstandingReceivable: '15000.00'`,
`unusedCredits: '0.00'`, Unix-second integer timestamps, and a `primaryContact`
object. Every field on `Customer` must be present so the Zod schema parses.
Call the factory **inside** each `it`, never at module level.

### Required tests

**`list`**

1. Requests `GET .../api/v1/customers` with no query string when called with no
   params, and returns the parsed list. Assert the full
   `{ data: { object: 'list', data: [...], has_more, total_count, url }, error: null }`
   result **and** the exact URL passed to fetch.
2. Serializes `ids` as a comma-joined string — `list({ ids: ['a', 'b'] })` must
   produce `?ids=a%2Cb` (or `?ids=a,b`, whichever `URLSearchParams` actually
   emits — check, don't guess).
3. Omits undefined params: `list({ status: 'ACTIVE' })` puts `status=ACTIVE` in
   the URL and **no** `limit`, `userId`, `organizationId`, `starting_after`, or
   `ending_before` keys.
4. Passes `limit` and the cursor params through when supplied.

**`retrieve`**

5. Requests `GET .../api/v1/customers/blcus_1` and returns the parsed customer.
6. URL-encodes the id: an id containing `/` or a space must appear
   percent-encoded in the URL.

**`update`**

7. Sends `PATCH` to the id's URL with the params as the JSON body, and returns
   the parsed customer. Assert the body string exactly.
8. Sends `status: 'ARCHIVED'` through as the archive path.

**`delete`**

9. Sends `DELETE` to the id's URL and returns
   `{ data: { object: 'customer', id: 'blcus_1', deleted: true }, error: null }`.

**Error handling (at least one)**

10. When fetch resolves an error envelope
    (`Response.json({ data: null, error: { code, message } }, { status: 404 })`),
    the verb returns `data: null` with the error's `code` preserved, and does
    not throw. Read `packages/billing/src/transport.ts` first to see the exact
    error shape the client produces, and assert what it really returns.

### Assertion rules — these are enforced

- Assert **both** sides of every `{ data, error }` result. `expect(result.data).toBeDefined()`
  is not a test.
- Assert `fetch` call arguments with `toHaveBeenCalledWith(url, expect.objectContaining({ method, ... }))`,
  never a bare `toHaveBeenCalled()`.
- Assert exact call counts with `toHaveBeenCalledTimes(1)`.
- Pin exact values. No `toBeGreaterThan`, no loose `toContain` where `toEqual`
  works.
- No `try/catch` inside a test body.
- `vi.clearAllMocks()` in a `beforeEach`.

## Do not

- Do not modify `resources/customers.ts`, the types, the schemas, or any other
  existing file. If a test fails because the implementation is wrong, **report
  it — do not fix it.**
- Do not add a shared fixture file.
- Do not use `as any`; `as unknown as T` only where a deliberate type violation
  is being tested.

## Verification (run these; paste the output)

```bash
cd /root/projects/876
pnpm --filter @876/billing test
pnpm --filter @876/billing typecheck
npx prettier --check packages/billing/src/resources/customers.test.ts
```

All previously passing tests must still pass (there were 92 before yours).

## Report back

Paste the verification output, state how many tests you added, and report any
implementation defect you found without fixing it.
