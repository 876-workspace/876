# Brief — rewrite the load-bearing rules for the bounded-client architecture

Model: `gpt-5.6-sol`, `model_reasoning_effort=medium`.
Branch: `refactor/bounded-service-clients` (already checked out; do not branch, commit, rebase, merge, or open a PR).

## Why this matters more than a docs task

`CLAUDE.md` and `.claude/rules/` are **loaded into every agent's context on
every session in this repository**. They are the operative contract, not
reference material. Right now they instruct every agent to use `$876` as a
universal facade and to add new methods to `@876/sdk` / `@876/admin` — which
the code no longer does. Until you finish, every agent working here is being
told two incompatible things, and will keep writing code in the old shape.

Precision matters more than coverage. A rule that is vague is worse than a rule
that is stale, because a stale rule is at least detectably wrong.

## The architecture you are documenting

Read `docs/architecture/020-bounded-service-clients-and-application-bffs.md`
first — it is the accepted decision and supersedes ADR 011 and ADR 016.

Then read the **finished reference implementations**, and describe what they
actually do rather than what this brief paraphrases:

```
apps/crm/src/lib/services/crm.ts          lazy module singleton, static server credential
apps/crm/src/lib/services/workspace.ts    request-scoped factory, signed-in user's bearer token
apps/console/src/lib/services/*.ts        eight explicit operator roots
packages/account/src/account.ts           what $876 now means
packages/workspace/src/session.ts         organization plane, session authority
packages/workspace/src/operator.ts        organization plane, operator authority
packages/platform/src/operator.ts         876 operator plane
packages/crm/src/{service-client,operator}.ts   caller-named entrypoints
```

The model in brief:

- **`$876` is the 876 Account only** — auth, current user, sessions, OAuth grants, mobile numbers. It is no longer an ecosystem router. Product resources never appear under it.
- **`workspace`** is the organization/B2B plane; **`platform`** is the 876 operator plane. Both are projections of the same Core API; the package split is vocabulary, not deployment.
- **Product SDKs are explicit roots**: `crm.requests.list()`, `work.tasks.list()`, `billing.invoices.create()`, `storage.files.retrieve()`, `couriers.packages.list()`, `widgets.notes.list()`.
- **An entrypoint names the caller principal**: `session`, `service`, `operator`, `integration`. Authority lives in the **import**, not in a `.admin` segment on the call chain.
- **Each host composes only the clients it needs** under its own `src/lib/services/`. There is no `@876/services`, no `$876.crm.*` container, and no replacement aggregator of any kind.
- **`@876/client` is being deleted.** `@876/sdk` and `@876/admin` are already thin compatibility shims over `@876/account` and `@876/platform`, and are deleted once the last app migrates.
- **Client lifetime**: a module singleton only when the credential is static, constructed **lazily on first use** (OpenNext imports route modules at build time, without runtime secrets); a request-scoped factory when an access token or active organization belongs to one request. Never a lazy `Proxy` to hide a lifecycle mistake.

## Files to rewrite

Counts are current facade references.

| File                                       | Refs | Nature of the work                                                                                                                                                   |
| ------------------------------------------ | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.claude/rules/sdk-conventions.md`         | 31   | The core one. Its tier table, its "adding a resource" recipe, and its client-initialization section are all now wrong.                                               |
| `.claude/rules/workspace-control-plane.md` | 26   | Its three-plane model (`$876` / `workspace` / `platform`) is _right in spirit_ and now literally true. Reconcile it with ADR 020 rather than rewriting from scratch. |
| `CLAUDE.md`                                | 20   | Repo root. The "Data Fetching Pattern", "Shared packages" table, and "Boundaries" sections.                                                                          |
| `.claude/rules/platform-services.md`       | 14   | Its three-bucket placement model stays; only the client surface it references changes.                                                                               |
| `.claude/rules/data-fetching.md`           | 11   | Its per-app facade table and examples.                                                                                                                               |
| `.claude/rules/api-access.md`              | 9    | Console's composition point; `createConsole876Client` is gone.                                                                                                       |
| `.claude/rules/app-api-routing.md`         | 8    | The browser/BFF boundary is unchanged in substance — only the server half's client names change.                                                                     |
| `.claude/rules/access-tiers.md`            | 3    | Already principal-shaped. It gains `service` as a fourth named tier alongside operator/integration/session.                                                          |
| `.claude/rules/app-structure.md`           | 1    | The `src/lib/` spine table: `876.ts` becomes per-domain roots under `services/`.                                                                                     |
| `.claude/rules/shared-product-ui.md`       | 1    | One leftover.                                                                                                                                                        |
| `.claude/rules/new-app-guide.md`           | 1    | One leftover.                                                                                                                                                        |

## What to preserve

Most of these files are mostly correct. **Change what the migration made false;
leave everything else alone.**

Specifically, keep intact — these are unaffected by the client refactor and are
load-bearing in their own right:

- the no-server-actions rule and the thin-route-handler shape;
- browser URLs using the host product's vocabulary, never service topology;
- `requireConsolePermission` before any facade call, plus Console's audit writes;
- the three-bucket placement decision in `platform-services.md`;
- the operator/integration/session consent reasoning in `access-tiers.md`, including "Console is an operator host, not an integration";
- the rule that a capability is implemented **once** by its owning service and merely routed again per tier;
- every `## Do not` list — update entries that became false, add ones the new model needs, and do not delete a prohibition that still holds.

## Mirroring

`.claude/rules/` is canonical. Every file also exists at
`.agents/rules/<same-name>`. **Apply the identical edit to both trees** and
verify they are byte-identical when you finish. `.grok/rules/` no longer exists
— do not create it. `CLAUDE.md` exists only at the repo root.

## Accuracy rules

- **Verify every claim against the code before you write it.** Do not state that a package exports something without checking its `exports` map and its source. A confidently wrong rule is the most expensive thing you can produce here.
- Where the code does **not** yet enforce a distinction, say so plainly instead of implying it does. Two known cases you must not paper over: `@876/billing/service` and `@876/couriers/service` are currently aliases of their **integration** client, and `@876/storage/service` and `@876/storage/operator` are the **same** client under two names. Describe the entrypoint names as caller intent, and note that the backend does not yet enforce two key classes there.
- Follow the repo's own UI-copy discipline in prose: no explanatory paragraph restating what a table already shows.
- Do not invent new rules, new vocabulary, or new prohibitions that the ADR does not support.

## Hard "do not"

- Do not touch anything outside `.claude/rules/`, `.agents/rules/`, and `CLAUDE.md`. Three other agents are migrating `apps/**` in parallel right now.
- Do not edit `.claude/rules/cli.md` and do not copy it anywhere.
- Do not reformat, reflow, or reorder a file beyond the edits the migration requires.
- Do not delete a section because its subject moved; retarget it.

## Verification

```bash
grep -rn '\$876\|@876/sdk\|@876/admin\|@876/client' .claude/rules/ .agents/rules/ CLAUDE.md
for f in .claude/rules/*.md; do diff -q "$f" ".agents/rules/$(basename $f)" || true; done
npx prettier --check ".claude/rules/*.md" ".agents/rules/*.md" "CLAUDE.md"
```

Every surviving hit from the first command must be **deliberate** — a mention of
`$876` as the Account client, or a historical note explicitly marked as such.
List each one in your report with its justification. The second command must
report no differences except `cli.md`, which exists only under `.claude/rules/`
and `.agents/rules/` in both trees — confirm whichever is actually true rather
than assuming. Prettier must pass; `access-control.md` currently fails prettier
on `main` and is **not** yours to fix.

## Report

Write `.claude/reports/codex/2026-08-30-rules-bounded-client-rewrite.md`: per
file, what changed and why; every claim you verified against code, with the
`file:line` you verified it from; every remaining `$876` mention and why it is
correct; anything in the old rules you believe is now wrong but chose not to
change, with your reasoning; and the verbatim output of each verification
command.
