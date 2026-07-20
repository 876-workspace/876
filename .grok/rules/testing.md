# Vitest Testing Rules (Exhaustive)

Read this file before writing, modifying, reviewing, or generating tests. This file is the exhaustive reference.

## Required Research Workflow

- Refer to existing project tests under `src/**/*.{test,spec}.{ts,tsx}` and `vitest.config.ts` first. Match local naming, placement, and style.
- Inspect local package types in `node_modules/vitest/dist/*.d.ts` and the installed version in `package.json` when an API detail is unclear.
- Consult official Vitest, Testing Library, or Next.js docs only when an API or behavior is unfamiliar and not covered by local project context.
- For Next.js-specific tests that mock or exercise App Router behavior, route handlers, Server Actions, redirects, cookies, headers, metadata, instrumentation, or build behavior, read the relevant Next.js 16 guide in `node_modules/next/dist/docs/` first.
- If writing tests requires changing application code, also read `.grok/rules/performance.md` and `.grok/rules/types.md` before editing that code.

## Project Testing Context

- This project uses `pnpm`, TypeScript, Next.js App Router, React 19, Vitest 4, jsdom, React Testing Library, `@testing-library/jest-dom`, and `@vitest/coverage-v8`.
- Use `pnpm test` for the test suite, `pnpm test:watch` while iterating when useful, and `pnpm test:coverage` when coverage is relevant.
- Current test config lives in `vitest.config.ts` with `environment: 'jsdom'`, `globals: true`, `include: ['src/**/*.{test,spec}.{ts,tsx}']`, and setup at `src/test/setup.ts`.
- Because globals are enabled, importing `describe`, `it`, and `expect` is optional. Follow the nearby test file style unless there is a reason to be explicit.
- Keep tests deterministic. Do not depend on real time, random values, network state, test order, local machine state, or external services.

## The Prime Directive

**Every test must be able to fail.** A test that cannot fail is not a test — it is a false certificate of correctness.

Before marking any test complete, ask: _"If I deleted the line of production code this test is supposed to cover, would this test fail?"_ If the answer is no or maybe, rewrite the test.

## Anti-Patterns — Never Do These

| Anti-pattern                                                   | Why it's wrong                                                            | Fix                                                   |
| -------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------- |
| `expect(result).toBeDefined()` as the only assertion           | Passes for any non-undefined value, including `{ error: 'catastrophic' }` | Assert the full shape                                 |
| `expect(mockFn).toHaveBeenCalled()` without argument check     | Passes even if called with wrong args                                     | Use `toHaveBeenCalledWith(...)`                       |
| Testing implementation details (private functions, call order) | Brittle; breaks on refactor                                               | Test the return value and observable effects          |
| One giant `it()` that covers 3 scenarios                       | Failure message is ambiguous; hard to debug                               | One `it()` per scenario                               |
| `try/catch` inside a test body                                 | Swallows assertion errors                                                 | Use `.rejects.toThrow()` or `mockRejectedValue`       |
| `setTimeout` or `setInterval` in tests                         | Flaky, slow                                                               | Fake timers                                           |
| Asserting `toContain` when `toEqual` is possible               | `toContain` is too loose                                                  | Use `toEqual` for full shape                          |
| Skipping tests with `it.skip` or `xit` without a ticket        | Dead test weight                                                          | Fix or delete; never skip indefinitely                |
| Using `as any` to bypass TypeScript in tests                   | Hides type errors                                                         | Use `as unknown as T` for intentional type violations |
| Mocking internal pure helpers in service tests                 | Circular — tests the mock not the service                                 | Let pure helpers run naturally                        |

## File Placement And Naming

- Place tests beside the source file by default: `src/lib/example.ts` -> `src/lib/example.test.ts`.
- Use `*.test.ts` or `*.test.tsx`. Use `*.spec.*` only when an existing nearby module already does.
- Use a `__tests__/` directory only when a module has many related test files and colocated tests would become noisy.
- Prefer one focused test file per source module. Mirror source module boundaries instead of creating broad catch-all test files.
- Do not add test-only application exports unless there is no practical way to test behavior through the public module contract.

## Test Design Standard

- Write production-quality tests that would catch real regressions. Do not write shallow tests that only assert a function "works".
- Test behavior and contracts, not implementation details. Avoid coupling tests to private helper order, incidental variable names, or non-observable internals.
- Understand the unit first: inputs, output type, sync or async behavior, purity, mutation, side effects, dependencies, error behavior, fallback behavior, and boundary conditions.
- If behavior is unclear, infer from the current implementation only when safe and document the assumption in a test name or short comment.
- Prefer the smallest test setup that proves the behavior. Exhaustive does not mean noisy or repetitive.

## Test Structure

- Use a top-level `describe` named after the function, component, hook, route handler, or module behavior.
- Nest `describe` blocks by behavior when useful: `happy path`, `edge cases`, `invalid inputs`, `error handling`, `async behavior`, `side effects`, `type contracts`.
- Write declarative test names that start with a verb and describe observable behavior.
- Do not use vague names like `it('works')`, `it('test 1')`, or `it('should work')`.

### Anatomy — Arrange, Act, Assert, After

Every test must follow Arrange → Act → Assert → After with no deviation:

```ts
it('returns domain-blacklisted without calling WorkOS for disposable domains', async () => {
  // ARRANGE — set up state, mocks, inputs
  const params = {
    email: 'jane@mailinator.com',
    password: 'sm2uTmv6InrQH6Az',
  }

  // ACT — call exactly one thing
  const result = await login(params)

  // ASSERT — assert every observable consequence
  expect(result.error?.code).toBe('auth/domain-blacklisted')
  expect(result.data).toBeNull()
  expect(workos.auth.login).not.toHaveBeenCalled()

  // AFTER — no teardown needed (handled by beforeEach vi.clearAllMocks)
})
```

### Rules

- **One act per test.** Never call the system under test twice in a single `it`.
- **Assert the complete result shape.** If `result` has `data` and `error`, assert both, not just one.
- **Assert side effects.** If a function should NOT call a dependency, assert `not.toHaveBeenCalled()` explicitly. If it should, assert `toHaveBeenCalledWith(...)` with exact arguments.
- **Name tests as specifications.** The test name should describe the behavior contract, not the implementation.

## Mutation-Resistant Assertions

Mutation testing deliberately changes production code (flips `===` to `!==`, changes `>` to `>=`, removes a return) and checks whether your tests catch it.

### Rules for mutation-resistant tests

**Rule 1 — Pin exact primitive values, not ranges:**

```ts
// ❌ Survives mutation of the status code
expect(response.status).toBeGreaterThanOrEqual(200)
// ✅ Kills the mutation
expect(response.status).toBe(401)
```

**Rule 2 — Assert the complete error object, not just one field:**

```ts
// ❌ A mutation of httpStatus survives
expect(result.error?.code).toBe('auth/invalid-credentials')
// ✅ A mutation of any field is caught
expect(result.error).toEqual({
  code: 'auth/invalid-credentials',
  message: '...',
  httpStatus: 401,
})
```

**Rule 3 — Assert call counts as exact numbers:**

```ts
// ❌ Passes even if analytics fires 5 times
expect(mockTrack).toHaveBeenCalled()
// ✅ Catches both missing calls and extra calls
expect(mockTrack).toHaveBeenCalledTimes(1)
```

**Rule 4 — Assert argument shapes, not just "was called":**

```ts
// ❌ Doesn't catch wrong endpoint or wrong schema
expect(mockPostAuthRequest).toHaveBeenCalled()
// ✅ Catches wrong endpoint, wrong params, wrong schema
expect(mockPostAuthRequest).toHaveBeenCalledWith(
  '/api/auth/login',
  { email: 'alejandra@example.com', password: 'sm2uTmv6InrQH6Az' },
  authLoginResponseSchema
)
```

**Rule 5 — Assert both sides of a `{ data, error }` result:**

```ts
// ❌ A mutation returning { data: null, error: null } survives
expect(result.data).toBeDefined()
// ✅ Catches any mutation of either field
expect(result.data).toEqual({ object: 'session', ... })
expect(result.error).toBeNull()
```

## Exhaustiveness Checklist

Before declaring any test file complete, check every item.

### Input exhaustiveness

- [ ] Empty string tested for every string input
- [ ] Whitespace-only string tested (`'   '`, `'\t'`, `'\n'`)
- [ ] Non-string runtime types tested where TypeScript won't catch them (`123 as unknown as string`, `null`, `undefined`, `{}`, `[]`, `true`)
- [ ] Maximum-length strings tested where there are length constraints
- [ ] Minimum-valid-length strings tested
- [ ] Strings with special characters tested

### Branch exhaustiveness

- [ ] Every `if` has a test for the truthy branch AND the falsy branch
- [ ] Every `else if` / `else` has its own test
- [ ] Every `switch` case has its own test including `default`
- [ ] Every ternary has a test for both outcomes
- [ ] Every `&&` short-circuit has a test where it short-circuits
- [ ] Every `||` fallback has a test where the fallback fires
- [ ] Every optional chain (`?.`) has a test where the chain is null/undefined
- [ ] Every nullish coalescing (`??`) has a test where the left side is null

### Error path exhaustiveness

- [ ] Every `catch` block is exercised by at least one test
- [ ] Every `throw` statement is triggered by at least one test
- [ ] Both `Error` instances AND non-`Error` thrown objects are tested
- [ ] Async rejections (`.mockRejectedValue`) are tested

### External dependency exhaustiveness

- [ ] Success response tested
- [ ] Error response tested (every distinct error code the dependency can return)
- [ ] Network/timeout failure tested (mock rejection with no raw data)
- [ ] Malformed/unexpected response shape tested
- [ ] Dependency returns `null` or `undefined` tested

### Side effect exhaustiveness

- [ ] Analytics/tracking calls: exact call count asserted for EVERY test
- [ ] Mock call arguments: `.toHaveBeenCalledWith(...)` with exact args, not just `.toHaveBeenCalled()`
- [ ] Functions that should NOT be called: `.not.toHaveBeenCalled()` asserted explicitly

## Negative Space Testing

For every function with guard clauses, test that the guards actually block downstream execution:

```ts
// Guard clause → no downstream call
it('does not call workos.auth.login when email is empty', async () => {
  await login({ email: '', password: 'pw' })
  expect(workos.auth.login).not.toHaveBeenCalled()
})

// Error response → no success side effects
it('does not call users.create when WorkOS login fails', async () => {
  vi.mocked(workos.auth.login).mockResolvedValue({ code: 'auth/invalid-credentials', ... })
  const result = await login({ email: 'alejandra@example.com', password: 'wrong' })
  expect(result.error).toBeTruthy()
  expect(users.create).not.toHaveBeenCalled()
})

// Component → no SDK call on invalid input
it('does not call sdk.auth.login when the email step fails validation', async () => {
  const user = userEvent.setup()
  render(<LoginForm />)
  await user.type(screen.getByLabelText(/email/i), 'not-an-email')
  await user.click(screen.getByRole('button', { name: /next/i }))
  expect(mockLogin).not.toHaveBeenCalled()
})
```

## State Transition Testing

For multi-step flows (wizard forms, verification flows, auth state machines), every state transition must be a separate test. Map out the state machine first:

```
LoginForm states:
  INITIAL → [valid email entered] → EMAIL_ACCEPTED
  INITIAL → [invalid email submitted] → INITIAL (error shown)
  EMAIL_ACCEPTED → [password entered, submit] → SUBMITTING
  EMAIL_ACCEPTED → [back button] → INITIAL
  SUBMITTING → [success] → REDIRECT
  SUBMITTING → [invalid credentials] → EMAIL_ACCEPTED (error shown)
  SUBMITTING → [email verification required] → VERIFY_EMAIL_STEP
```

Each arrow is a required test. Required assertions per transition:

1. The UI after the transition — which elements are present/absent
2. The SDK/service call — was it called, with what args
3. The error message — is it shown/hidden correctly
4. The previous state's elements — are they gone

## Security Input Corpus

Every function that accepts user-supplied strings MUST be tested using `it.each`:

```ts
const SECURITY_INPUTS = [
  '<script>alert(1)</script>',
  "' OR '1'='1",
  '../../etc/passwd',
  '__proto__',
  '\u0000',
  '\u202e',
  'a'.repeat(10_000),
] as const
```

## Layer-by-Layer Requirements

### Pure Utilities

- Happy path for every meaningful valid input
- Each required field missing independently
- Empty/whitespace for each string field
- Wrong types: `null`, `undefined`, `0`, `false`, `{}`, `[]` via `as unknown as T`
- Boundary values
- Security corpus
- Complete return value shape
- Purity (call twice, same result)

### Error Registries

- Every known code exists
- No duplicate codes
- Sorted alphabetically
- All httpStatus values are valid HTTP status codes
- All messages are user-safe (no stacks, file paths, internal identifiers)
- No placeholder text (TODO, FIXME)
- Consistent punctuation (messages end with period)
- Message length between 10 and 200 characters
- Snapshot of all codes to catch accidental additions/removals

### App Service Layer

- Happy path: full `{ data, error: null }` shape assertion
- Validation: one test per field that can fail
- Domain blocklist: assert `not.toHaveBeenCalled()`
- WorkOS error propagation: every error code the function can receive
- WorkOS network failure: rejection with no rawData
- Users service failure propagation
- Redirect safety: external URL, javascript://, data://, relative path
- Email verification branching
- Null/undefined WorkOS response
- Side effects: users.create called with exact args

### WorkOS Service Layer

- Happy path with session save
- Missing env vars: each independently (CLIENT_ID, COOKIE_PASSWORD, REDIRECT_URI)
- Short cookie password (< 32 chars)
- Input validation: empty email, empty password
- Session save failure propagation
- WorkOS throws Error with rawData.code
- WorkOS throws Error with cause.rawData.code
- WorkOS throws plain Error (no rawData)
- WorkOS throws non-Error object
- WorkOS throws null
- emailVerificationRequired response
- Optional params present and absent

### SDK Layer

- Client validation blocks network call for every field
- Correct endpoint path asserted
- Correct schema passed
- Correct params passed
- Success response propagated with full shape
- Error response propagated with code + message
- Network error propagation
- Null/undefined data from server
- Special responses (email_verification, social URL)

### API Route Handlers

- Invalid JSON body → 400 + 2 analytics calls
- Empty body {} → 400
- Missing each required field independently → 400
- Valid input, service success → 200 + full response body + 1 analytics call
- Valid input, each service error → correct HTTP status + error body + 2 analytics calls
- Service throws unexpectedly → 500 + internal-error
- Email verification required → 200 + auth_event body
- Extra unknown fields in body
- Very large body
- Wrong HTTP method if handled

**Required: Assert exact analytics call count in every test.**

### React Components

- Initial render: correct elements present/absent
- Accessibility: inputs have labels, buttons have accessible names
- Each form field empty → error shown, submission blocked
- Each field invalid → correct error message
- Each state transition (see state transition testing)
- Successful submission → SDK called with exact params, redirect fires
- Error response from SDK → error message rendered, form remains interactive
- Loading state → submit button disabled during async
- Keyboard navigation: Tab order, Enter submits

### Analytics Layer

- undefined property removal
- null property removal
- Sensitive property stripping: password, token, secret, api_key, authorization
- Source injection (source: 'client' or 'server')
- Identity dispatch when user present and identify !== false
- Identify opt-out
- Error auto-extraction (→ error_code, error_message, status_code)
- Anonymous ID from cookie
- Display name building (firstName + lastName)
- Dispatch called exactly once per track call
- Provider initialization on first track

## Mock Discipline Rules

**Rule 1:** `vi.clearAllMocks()` in every `beforeEach`.
**Rule 2:** Default mock return values set in `beforeEach`, overridden in specific tests.
**Rule 3:** Never mock internal pure helpers — test them directly or let them run.
**Rule 4:** Always use `vi.hoisted` for functions referenced inside `vi.mock`.
**Rule 5:** `vi.unstubAllEnvs()` in `afterEach` whenever `vi.stubEnv` is used.
**Rule 6:** `vi.useRealTimers()` in `afterEach` whenever `vi.useFakeTimers()` is used.
**Rule 7:** Mock only modules the unit under test actually imports.
**Rule 8:** The Prisma dynamic ref pattern is required for all Prisma-dependent tests.

```ts
const { mockPrismaRef } = vi.hoisted(() => ({
  mockPrismaRef: { current: null as MockPrismaClient | null },
}))

vi.mock('@/lib/prisma', () => ({
  get prisma() {
    return mockPrismaRef.current
  },
}))
```

## Fixture and Factory Rules

**Rule 1:** Every test file defines its own factories — no shared fixture files.
**Rule 2:** Factories use `Partial<T>` overrides with spread at end.
**Rule 3:** Defaults must be realistic domain data, not `'test'` or `'foo'`.
**Rule 4:** Factories are called inside `it()`, not at module level (prevents shared mutable state).
**Rule 5:** Use `overrides` to test each variant inline.

```ts
function createWorkosAuthResponse(
  overrides: Partial<WorkosAuthResponse> = {}
): WorkosAuthResponse {
  return {
    email: 'alejandra@example.com',
    id: 'user_2kL9mN4q',
    firstName: 'Alejandra',
    lastName: 'Reyes',
    // ... all defaults
    ...overrides,
  }
}
```

## Timing, Async, and Timer Rules

- Use `vi.useFakeTimers()` + `vi.setSystemTime()` for any function that reads `Date.now()` or `new Date()`.
- Use `await` on all async calls — never fire-and-forget.
- Use `waitFor` for React state updates that happen after async calls.
- Never use `setTimeout` in tests — use fake timers + `vi.advanceTimersByTime()`.
- For Promise-based tests, always test both resolve and reject paths.
- Test that a loading state appears AND disappears.

## Regression Anchor Pattern

When a bug is found and fixed, immediately write a test that would have caught it:

```ts
it('does not redirect to external URL when redirectTo contains query params', async () => {
  // Regression: crafted redirectTo with ?next= could redirect offsite
  const result = await login({
    email: 'alejandra@example.com',
    password: 'pw',
    redirectTo: '/dashboard?next=https://evil.com',
  })
  expect(result.data?.redirectTo).toBe('/dashboard')
})
```

## Coverage Expectations

- Aim for meaningful coverage, not fake coverage.
- Practical default target: 90%+ statements, branches, functions, and lines for application code.
- For pure utilities, error registries, and critical auth logic: aim for 100% branch coverage.
- Every exported function must have direct or behavior-level coverage.
- Coverage is necessary but not sufficient. Every coverage hit must have a meaningful assertion.

## Completion Checklist

Before finishing test work, verify:

- [ ] Happy paths are covered
- [ ] Error paths and thrown errors are covered
- [ ] Branches, early returns, defaults, and fallbacks are covered
- [ ] Boundary values are covered where relevant
- [ ] Runtime-invalid inputs are covered where external data can reach the unit
- [ ] Async paths are awaited and cover resolve and reject behavior
- [ ] External dependencies are mocked at the right boundary
- [ ] Time, randomness, and environment behavior are deterministic
- [ ] Inputs are not accidentally mutated, or intentional mutation is asserted
- [ ] Test names describe behavior clearly
- [ ] Tests are not coupled to implementation details
- [ ] Tests are readable and maintainable
- [ ] No floating promises, focused tests, unnecessary snapshots, weak assertions, or flaky timing
- [ ] Every guard clause has a negative-space test
- [ ] Every state transition has a test
- [ ] Security corpus applied to all user-facing inputs
- [ ] Analytics call counts asserted as exact numbers
- [ ] Both sides of { data, error } results asserted
- [ ] Relevant commands have passed: `pnpm test`; `pnpm test:coverage` when coverage is part of the request
