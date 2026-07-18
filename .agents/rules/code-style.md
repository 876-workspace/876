# Code Style & Formatting Rules

Read this file before generating or editing application code.

## Formatting & Linting Requirement

The project uses Prettier and ESLint to maintain code quality and style. These checks are **not** required after every individual file modification or implementation pass.

Prettier is a workspace-level requirement. Use the root `.prettierrc` for all workspace packages; it is the source of truth for formatting rules, including `singleQuote: true`.

Instead, they must be run **only as part of the git workflow**, before committing changes. This ensures that:

- AI-generated code matches project standards.
- Git diffs remain clean and focused on logic changes.
- Development is not slowed down by frequent formatting/linting overhead.

See `.claude/rules/git.md` for the specific pre-commit workflow.

## Thermo-Nuclear Quality Review

For non-trivial implementation changes, run the `thermo-nuclear-code-quality-review` skill before committing. Treat this as a maintainability and structure gate, not a formatter.

Use it when a change adds or modifies:

- Shared packages, app-wide utilities, SDK/admin clients, middleware, or provider integrations.
- Cross-app abstractions or reusable runtime infrastructure.
- Large components, route handlers, service/repository code, or files nearing 1,000 lines.
- New condition-heavy flows, optional modes, generic wrappers, or behavior that touches multiple layers.

Do not use it for docs-only, formatting-only, config-only, or trivial one-line fixes unless the change creates a structural risk.

The review must check for:

- Structural simplifications that delete concepts, branches, wrappers, or layers.
- File-size growth, especially files crossing 1,000 lines.
- Spaghetti growth from ad-hoc conditionals, nullable modes, or scattered special cases.
- Abstraction and ownership leaks across packages, apps, API routes, providers, and shared utilities.
- Duplicate helpers or bespoke logic where a canonical module already owns the concept.

The skill is review-only by default. Apply fixes only when explicitly requested or when already operating in an implementation task where the user asked to make improvements.

## Code Style Rules — `src/lib/` and `src/app/api/`

> **Scope:** These rules apply **only** to files inside `src/lib/` and `src/app/api/`.
> They are always active. Apply them whenever you write or modify TypeScript (`.ts`) or TSX (`.tsx`) files in those folders — during generation, edits, and refactors alike.
> This is a **style-only** ruleset. Never change runtime behavior, control flow, public APIs, imports, exports, types, validation rules, error handling, or business logic to satisfy these rules.

---

## Rule 1 — Remove Braces From Single-Statement `if` Blocks

### What it does

When an `if` block has exactly one body statement and no `else` or `else if`, remove the curly braces entirely. The goal is to reduce visual noise for simple guard clauses and early returns, which are extremely common in service and route handler code.

### When to apply

- The `if` has **no** `else` or `else if`
- The body is **exactly one statement**
- That statement does **not** declare a block-scoped variable (`const`, `let`, `class`, `function`)
- The result is readable — do not collapse if the combined line becomes excessively long

### When NOT to apply

Do not apply to:

- `for`, `while`, `do while`, `switch`, `try/catch/finally` blocks
- Arrow function bodies or object methods
- Any `if` that has an `else` or `else if` branch
- Bodies that declare `const`, `let`, `class`, or `function`

---

### Examples

**Early return guard — apply**

```ts
// Before
if (isFullError(sessionResult)) {
  return sessionResult
}

// After
if (isFullError(sessionResult)) return sessionResult
```

**Null check guard — apply**

```ts
// Before
if (!user) {
  return notFound()
}

// After
if (!user) return notFound()
```

**Throw on invalid state — apply**

```ts
// Before
if (!config.apiKey) {
  throw new Error('Missing API key')
}

// After
if (!config.apiKey) throw new Error('Missing API key')
```

**Setting a property — apply**

```ts
// Before
if (options.verbose) {
  logger.level = 'debug'
}

// After
if (options.verbose) logger.level = 'debug'
```

**Long condition, long return — keep split across lines (do not force onto one line)**

```ts
// Acceptable — condition + return are both long
if (someVeryLongConditionThatIsHardToRead && anotherLongCondition)
  return someVeryLongExpression

// Also acceptable — same thing on one line if it fits
if (err) return handleError(err)
```

**Body declares `const` — skip**

```ts
// Do NOT apply — body declares a block-scoped variable
if (isError(result)) {
  const message = result.error.message
  return message
}
```

**Has `else` branch — skip**

```ts
// Do NOT apply — there is an else
if (isAdmin) {
  return adminDashboard()
} else {
  return userDashboard()
}
```

**Inside a `try` block — skip**

```ts
// Do NOT apply — this is inside a try/catch
try {
  if (badInput) {
    return earlyExit()
  }
}
```

---

## Rule 2 — Add Line Breaks Between Logical Concern Groups

### What it does

Within function bodies, insert a single blank line between distinct groups of related work. This makes the logical structure of a function immediately scannable — you can see at a glance where one step ends and the next begins.

A **concern group** is a cluster of statements that belong together conceptually:

- A variable declaration paired with its guard clause
- A validation step
- A redirect or default-value resolution
- A data-fetching or service call
- A result parsing or narrowing step
- A transformation step
- A session or side-effect persistence step
- An error extraction and branching step inside a `catch`
- A final return or response assembly

### Rules

- Add **one** blank line between distinct groups
- Keep a variable declaration and its immediate guard clause **together** in the same group — never split them
- Keep tightly related operations together (e.g. a fetch and its immediate result check)
- The final return can be separated visually when the function is long enough to benefit from it
- Never add more than one consecutive blank line
- Never add a blank line immediately after an opening brace or before a closing brace
- Do not reorder code to create groups

---

### Examples

**Simple utility function — two groups**

```ts
// Before — no breathing room between concerns
function resolveUserLabel(session: Session | null): string {
  const user = fetchUser(session?.userId)
  if (!user) return 'Guest'
  return user.displayName ?? user.email
}

// After — validation group is now visually distinct from the return
function resolveUserLabel(session: Session | null): string {
  const user = fetchUser(session?.userId)
  if (!user) return 'Guest'

  return user.displayName ?? user.email
}
```

**Three concern groups — session, user, response**

```ts
// Before
async function handleRequest(req: Request) {
  const session = await getSession(req)
  if (!session) return unauthorized()
  const user = await fetchUser(session.userId)
  if (!user) return notFound()
  return buildResponse(user)
}

// After
async function handleRequest(req: Request) {
  const session = await getSession(req)
  if (!session) return unauthorized()

  const user = await fetchUser(session.userId)
  if (!user) return notFound()

  return buildResponse(user)
}
```

**Inside a `try` block — provider call separated from persistence**

```ts
// Before
try {
  const authResponse = await authenticateUser(params)
  const sessionResult = await saveAuthSession(authResponse)
  if (isFullError(sessionResult)) return sessionResult
  return { success: true }
}

// After
try {
  const authResponse = await authenticateUser(params)

  const sessionResult = await saveAuthSession(authResponse)
  if (isFullError(sessionResult)) return sessionResult

  return { success: true }
}
```

**Inside a `catch` block — error extraction separated from handling**

```ts
// Before
catch (error) {
  const authError = extractAuthenticationError(error)
  if (authError?.code === 'email_verification_required') return handleEmailVerification(authError)
  return handleUnknownError(error)
}

// After
catch (error) {
  const authError = extractAuthenticationError(error)

  if (authError?.code === 'email_verification_required')
    return handleEmailVerification(authError)

  return handleUnknownError(error)
}
```

**Transformation pipeline — parse, transform, return**

```ts
// Before
function normalizePayload(raw: unknown): NormalizedPayload {
  const parsed = parseRaw(raw)
  if (!parsed.ok) throw new Error(parsed.error)
  const trimmed = trimFields(parsed.value)
  const normalized = applyDefaults(trimmed)
  return normalized
}

// After
function normalizePayload(raw: unknown): NormalizedPayload {
  const parsed = parseRaw(raw)
  if (!parsed.ok) throw new Error(parsed.error)

  const trimmed = trimFields(parsed.value)
  const normalized = applyDefaults(trimmed)

  return normalized
}
```

**Short function — do not add blank lines that make it feel sparse**

```ts
// This is fine as-is — don't add blank lines to a 2-line body
function isExpired(token: Token): boolean {
  return token.expiresAt < Date.now()
}
```

---

## Rule 3 — Collapse Simple `if` / `else` Assignments to Ternaries

### What it does

When an `if` / `else` block does nothing except assign one of two simple values to the same variable, replace it with a single ternary expression on one line (or split across lines if long). Also change `let` to `const` when the variable is no longer reassigned after the refactor.

This removes 4–6 lines of boilerplate for a very common pattern and makes the "this is just a value choice" intent immediately obvious.

### When to apply

- Both branches assign to the **same variable**
- Both branches are **single assignment statements**
- Both assigned values are **simple expressions** (literals, identifiers, simple calls)
- The variable is **not reassigned** anywhere after the block
- The result is **not a nested ternary**
- The resulting line is readable

### When NOT to apply

- Either branch has additional logic (logging, side effects, multiple statements)
- The variable is reassigned later in the function
- The result would be a nested ternary
- The resulting expression is too long or unclear
- The assigned values are complex expressions

---

### Examples

**String label based on count — apply**

```ts
// Before
let label
if (count > 1) {
  label = 'items'
} else {
  label = 'item'
}

// After
const label = count > 1 ? 'items' : 'item'
```

**Boolean flag based on role — apply**

```ts
// Before
let isEditable
if (user.role === 'admin') {
  isEditable = true
} else {
  isEditable = false
}

// After
const isEditable = user.role === 'admin'
// (even simpler — no ternary needed when both sides are boolean literals)
```

**CSS class string — apply**

```ts
// Before
let className
if (isActive) {
  className = 'tab tab--active'
} else {
  className = 'tab'
}

// After
const className = isActive ? 'tab tab--active' : 'tab'
```

**Endpoint path based on environment — apply**

```ts
// Before
let baseUrl
if (env === 'production') {
  baseUrl = 'https://api.example.com'
} else {
  baseUrl = 'https://staging.api.example.com'
}

// After
const baseUrl =
  env === 'production'
    ? 'https://api.example.com'
    : 'https://staging.api.example.com'
```

**Variable reassigned later — skip**

```ts
// Do NOT apply — label is reassigned again below
let label
if (count > 1) {
  label = 'items'
} else {
  label = 'item'
}
if (count === 0) label = 'none' // reassigned here
```

**Either branch has multiple statements — skip**

```ts
// Do NOT apply — else branch does two things
if (isAdmin) {
  role = 'admin'
} else {
  logAccess(user)
  role = 'viewer'
}
```

**Would produce a nested ternary — skip**

```ts
// Do NOT apply — nesting makes this unreadable
if (isAdmin) {
  label = isActive ? 'admin-active' : 'admin-inactive'
} else {
  label = 'viewer'
}
// Result would be: const label = isAdmin ? (isActive ? 'admin-active' : 'admin-inactive') : 'viewer'
// Leave this as if/else
```

**Complex assigned value — skip**

```ts
// Do NOT apply — assigned value is a complex multi-arg call; keep as if/else for clarity
if (hasError) {
  message = formatErrorMessage(error, { includeStack: true, verbose: true })
} else {
  message = formatSuccessMessage(result, user)
}
```

---

## Safety Constraints (Always Active)

These constraints override everything above. When in doubt, skip the style change.

- Do not change runtime behavior, control flow, or business logic
- Do not reorder statements
- Do not rename variables
- Do not change imports or exports
- Do not change error messages or return values
- Do not change function signatures or public APIs
- Do not change or remove existing comments unless they become factually inaccurate due to the style change
- Do not introduce new abstractions or helper functions
- Do not apply these rules to generated files, build output, minified files, lockfiles, or `node_modules`
- Do not apply these rules outside of `src/lib/` and `src/app/api/`
- Prefer a smaller, obviously safe change over a large aggressive one
