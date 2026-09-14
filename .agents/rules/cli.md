# Sub-Agent & CLI Model Routing

Read this before spawning any sub-agent or driving any external CLI (Codex,
Cline, `opencode`, Command Code, `agy`, Muse Code) for a delegated chunk of work.
It defines the **default operating mode**, **which model/tool handles which class
of task**, **how to spend every free and prepaid quota before paying for more**,
and how to invoke each CLI non-interactively. See
`.claude/rules/implementation-tracker.md` for tracking multi-file delegated work.

## Default operating mode — Claude orchestrates, CLIs write the code

Unless the user explicitly says otherwise, **Claude runs as the orchestrator**
(user, 2026-09-14: _"always go for an orchestrator pattern unless instructed
otherwise"_). The orchestrator:

1. explores just enough to write precise briefs (file paths, the reference
   implementation to copy, exact scope, verification commands);
2. writes each brief to `plans/<run>/briefs/<tool>/…` and dispatches it to the
   **cheapest tool that can do the job** (routing table below);
3. monitors the runs, reads every report and diff, runs verification itself;
4. fixes small defects directly, splits the work into focused PRs, merges, deploys.

Claude writes code itself only for security-critical/design-critical work
(auth, key handling, sessions, provisioning — see "Fable is never delegated"),
for small surgical fixes found during verification, or when every delegate tier is
unavailable. Claude `Agent` sub-agents are **not** the default delegate — use them
only when the user asks, or for read-only exploration no CLI can do.

## Spend order — exhaust free and prepaid quota first

The user's standing instruction (2026-09-14): _"always use and exhaust [the free
models] whenever you see fit to capitalize on free usage … use the hell out of
Command Code … look at all models by all the CLIs and use them up."_

| Order | Pool                                                            | What it costs                        | Use it for                                                                                                                                                                       |
| ----- | --------------------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | **Cline free models** (daily limits per model)                  | free                                 | cheap/easy work, UI copies of an existing pattern, docs, renames, tests for existing code                                                                                        |
| 2     | **opencode free models**                                        | free                                 | same tier, second free pool                                                                                                                                                      |
| 3     | **Command Code** — DeepSeek V4.1 Flash (and the `:free` models) | prepaid $1/month, extremely generous | same tier, and anything the free pools are out of — **use it up**                                                                                                                |
| 4     | **Codex** — `gpt-5.6-terra` at **medium** by default            | ChatGPT plan quota                   | tougher implementation: cross-layer features, service + SDK + UI changes, hard bugs; `high` only when the brief is genuinely hard, `gpt-5.6-luna` when the user asks for cheaper |
| 5     | Claude (this session)                                           | most expensive                       | orchestration, design/security-critical code, verification                                                                                                                       |

Rules:

- **Rotate, don't stop, when a model hits its daily limit.** A free model that
  answers with a limit/quota/"promotion ended" error, or exits having written
  nothing, is switched for the next model in the same pool, then the next pool.
  Record which model finished the run in the report and `plan.md`.
- **Probe before a long run** (one-word prompt, costs nothing) when a model may be
  exhausted — see each CLI's probe command below.
- **Gemini (`agy`) is currently out** (2026-09-14). Do not route work to it until
  the user says it is back.
- **Memory is the real concurrency limit.** This host has 7 GB RAM and runs the
  dev server; five parallel delegates OOM-killed every run on 2026-09-14. Run
  **at most two local delegates at once**, and tell every delegate to run one
  verification command at a time.

## Available tooling — verified 2026-09-14, do not re-probe

| Tool                    | Command                                                                                                                          | Notes                                                                                                                                                       |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cline**               | `cline -c <dir> -m <model> --thinking none -t <secs> "<prompt>" < /dev/null`                                                     | Free pool #1. Headless act mode, auto-approve. **Reads a lot** — see "Briefing the free tier".                                                              |
| **opencode**            | `opencode run -m <model> [--variant <effort>] --auto "<prompt>" < /dev/null`                                                     | Free pool #2. An invalid flag prints help and exits 0 with no changes — check the diff.                                                                     |
| **Command Code**        | `command-code -p --yolo --skip-onboarding -m <model> --max-turns <n> "<prompt>" < /dev/null`                                     | Prepaid; DeepSeek V4.1 Flash is the workhorse. `--effort low\|medium\|high`, `--output-format json` for an NDJSON stream. `--list-models` shows ~70 models. |
| **Codex**               | `codex exec -m gpt-5.6-terra -c model_reasoning_effort=medium --dangerously-bypass-approvals-and-sandbox "<prompt>" < /dev/null` | Models: `gpt-5.6-terra`, `gpt-5.6-luna`, `gpt-5.6-sol`, `gpt-5.5`, plus `gpt-6-astra` and `gpt-reserve` (not yet evaluated). Always pass `-m` and effort.   |
| **Muse Code** (Meta)    | `muse exec --trust-workspace`                                                                                                    | Cannot run commands in this container — see its section.                                                                                                    |
| **agy** (Antigravity)   | `agy`                                                                                                                            | **Gemini out as of 2026-09-14.**                                                                                                                            |
| **Cloudflare Wrangler** | `npx wrangler`                                                                                                                   | authenticated (legacy; apps deploy on Vercel now)                                                                                                           |
| **GitHub CLI**          | `gh`                                                                                                                             | authenticated as `876-workspace`                                                                                                                            |
| **Sentry**              | `sentry`                                                                                                                         | authenticated, org `efesto`. Never `sentry-cli` (unauthenticated).                                                                                          |
| **Docker**              | —                                                                                                                                | unavailable                                                                                                                                                 |

**MCP servers** (`.mcp.json`, repo root): `sentry` — HTTP, `https://mcp.sentry.dev/mcp`.

Traps worth remembering:

- **Never write a `pgrep` guard whose own pattern matches the command line it
  runs in.** Match `cod[e]x exec`, `[c]line -c`, `[o]pencode run`,
  `[c]ommand-code -p`, never a bare string that appears in the monitor itself.
- **Exit code 0 means nothing.** Cline, opencode, Command Code and Codex all exit
  0 after refusing, stalling, hitting a quota, or writing nothing. Judge by
  `git status`/`git diff` and the report file.

## Routing table

| Task class                                                                                                                  | First choice                                                                   | Fallback                                                        |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| Copy an existing pattern into another app (a settings page, a list/detail section, route handlers mirroring another app)    | Cline free model                                                               | opencode free → Command Code DeepSeek V4.1 Flash                |
| Trivial / mechanical / mass-simple edits (renames, bulk find-replace, boilerplate) — split across non-overlapping file sets | Command Code DeepSeek V4.1 Flash (parallel runs)                               | Cline / opencode free                                           |
| Docs-only work (`.md`, rule files, README, OpenAPI prose)                                                                   | Cline free model                                                               | Command Code DeepSeek V4.1 Flash                                |
| Tests for existing, stable code                                                                                             | Command Code DeepSeek V4.1 Flash                                               | Cline free                                                      |
| General feature work spanning a few layers                                                                                  | Codex `gpt-5.6-terra` medium                                                   | Command Code `deepseek/deepseek-v4-pro` or `moonshotai/kimi-k3` |
| Advanced implementation (service + SDK + UI + migrations, hard bugs)                                                        | Codex `gpt-5.6-terra` high                                                     | Codex `gpt-5.6-sol`                                             |
| Well-specified module port with a mechanical check                                                                          | Muse Code                                                                      | Codex terra medium                                              |
| Large multi-phase feature the user will relay by hand                                                                       | GPT web (see section)                                                          | Codex terra                                                     |
| Code exploration / research the orchestrator cannot cheaply do itself                                                       | the orchestrator's own `rg`/`sed`; a Sonnet `Agent` only if explicitly allowed | —                                                               |
| Design decisions / security-critical code (auth, key handling, sessions, provisioning, deletion)                            | **the orchestrator itself** — never delegated                                  | —                                                               |

**Reasoning-effort note:** the `Agent` tool's `model` parameter only selects the
model; express depth in the brief. For CLIs pass the effort flag explicitly
(`-c model_reasoning_effort=`, `--variant`, `--effort`, `--thinking`).

## Code exploration on Sonnet (high effort) — matching orchestrator-quality results

Exploration is the most token-heavy category relative to the value returned,
so it is the first one to delegate — but a shallow brief produces a shallow
result. To get the same depth of findings a primary Sonnet/Opus agent would
produce doing the search itself, the brief to the exploration sub-agent must:

1. **Name the exact question(s)** the sub-agent must answer — not "look into
   the auth flow" but "locate every call site of `unsealSession876`, the
   shape of the session snapshot it returns, and every guard function in
   `src/lib/auth/guards.ts` that consumes it."
2. **State why** the answer is needed (what decision or edit it feeds), so
   the sub-agent can judge what's relevant vs noise and include the right
   surrounding context in its findings.
3. **Specify the return shape**: file paths with line numbers for every
   claim, exact signatures/shapes (not paraphrases) for any type or contract
   it finds, and an explicit "not found" call-out for anything it searched
   for but couldn't locate (so the orchestrator doesn't assume silence means
   absence).
4. **Bound the scope** — which packages/apps are in play, which are
   explicitly out of scope — so the sub-agent doesn't wander the whole
   monorepo when three directories would answer the question.
5. Prefer the `Explore` agent type for narrow lookups ("where is X defined")
   and a fresh `general-purpose`/plain sub-agent at `model: sonnet` for
   broader multi-part research that needs judgment about what's relevant.

A one-line prompt ("explore the enterprise ERM code") reliably under-performs
the orchestrator doing it directly. A prompt built from the five points above
does not — that's the entire reason to delegate it.

## Fable is never delegated

Fable is reserved for design decisions and the highest-stakes,
security-sensitive, or correctness-critical code on the platform — auth,
session sealing, key/credential handling, org provisioning/entitlement
logic, deletion/tombstone paths, anything where "probably right" is not
good enough.

- **The primary agent executes this work directly**, at high reasoning
  effort. Do not hand it to a Fable sub-agent by default.
- **Never spawn a Fable sub-agent at medium or high reasoning.** The only
  exception is a **low**-reasoning Fable sub-agent for a narrow, bounded
  check, and even then **always ask the user first** before spawning it.
- If a task seems to call for a Fable sub-agent at anything above low
  effort, that is a signal the primary agent (you) should be doing the work
  itself, not delegating it.

## Codex — the tier for tougher work

Default: **`gpt-5.6-terra` at `medium`** (user, 2026-09-14). Raise to `high` for a
genuinely hard brief (cross-service, migrations, security-adjacent); use
`gpt-5.6-luna` when the user asks for a cheaper run. Codex is not for work the
free tier can do from a precise brief.

**Always pass `-m` explicitly.** The configured default has changed at least
once without this file noticing, so a bare `codex exec` is a guess about which
model ran. State the model in the run and in the report.

**A green `lint` from a delegated run proves nothing on its own.** Codex has
satisfied a lint gate by adding `/* eslint-disable @typescript-eslint/no-explicit-any */`
to the top of every file it wrote (observed 2026-08-27, CRM Phase A). Before
accepting any delegated implementation, run:

```bash
grep -rn "eslint-disable" <the paths it touched>
```

and check the test **count** moved, not just that the suite is green — the same
run reported success having written none of the ten tests its brief required.
Verify the work, not the summary.

## `agy` (Antigravity) — Gemini tier (OUT as of 2026-09-14; do not route work here)

Antigravity is the default tool for high-volume work that does not need to be
correct on the first try: documentation, Markdown, placeholder scaffolding,
mechanical file generation, and bulk repetitive edits.

**Its capacity is large on Gemini models and small on Claude/GPT models — they
are separate quota buckets.** "Effectively unlimited" was recorded here from the
Gemini experience and is not true of the whole tool. Measured 2026-09-06:

| Bucket                | Weekly | 5-hour   |
| --------------------- | ------ | -------- |
| Gemini models         | 66%    | 100%     |
| Claude and GPT models | 0%     | disabled |

**Check before delegating, never guess** — quota state is a one-line query that
costs nothing and needs no agent turn:

```bash
agy --output-format json --print-timeout 60s -p "/quota"
```

An exhausted bucket does not fail loudly. It returns `"status":"ERROR"` with
`"error":"Individual quota reached…"` in the `stream-json` result — and under
plain `--print` it can look exactly like a model that read its context and gave
up. Two hours were lost to that on 2026-08-07 before the quota was checked.

**So: send agy work to Gemini.** This reinforces the Models table below — route
Claude-model work through the `Agent` tool, which does not share this bucket.

The trade-off is that it follows instructions literally rather than inferring
intent. A brief that would be enough for Codex is not enough for `agy`. Give it:

- the exact template or example output, verbatim;
- a numbered table of every file to produce and every value that changes per file;
- an explicit list of files it must **not** touch;
- the verification commands to run before reporting done.

**You must always review its output yourself.** Delegating to `agy` and committing
the result unread is not delegation.

### Invocation

```bash
agy --model=gemini-3.1-pro-high \
    --print-timeout 50m \
    --output-format stream-json \
    --dangerously-skip-permissions \
    --print "$(cat plans/<run>/briefs/agy/<brief>.md)"
```

**`--print-timeout` defaults to `5m0s`. Always set it.** Anything longer than a
few minutes is killed mid-run, and because tool calls have already executed, the
result is the worst possible failure: files half-written, **exit code 0**, and
nothing on stdout. On 2026-08-07 this was misread as four separate model
failures; one of those "failures" had in fact applied every edit it was asked
for. Set it above the real duration of the work.

**Use `--output-format stream-json` for anything non-trivial.** It emits typed
NDJSON (`init`, `step_update`, terminal `result` with `status` and `error`)
incrementally, so a quota rejection or a stall is visible during the run instead
of being inferred afterwards. Plain `--print` writes **nothing** to a pipe or a
redirect on some versions — [antigravity-cli#408](https://github.com/google-antigravity/antigravity-cli/issues/408),
open as of 2026-08-07 — so an empty log file is not evidence of an empty result.

**Flag order matters.** `--print` (alias `-p` / `--prompt`) takes the prompt as its
value, so it must come **last**, immediately before the prompt string. Writing
`agy --print --model=X "<prompt>"` makes `agy` treat the model name as the prompt
and silently answer the wrong question — it exits 0 and writes nothing.

Note the `=` in `--model=`; use that form. **`--effort` is rejected by the
Claude models** — passing it kills the run instantly.

**Never put the invocation command inside the brief as a bare `Tool:` line.** The
delegate reads it as an instruction and spends its turn shelling out to a nested
`agy` instead of doing the work. Label it explicitly as an orchestrator note, or
leave it out of the brief entirely.

Whatever the flags, **confirm what it did with `git status` and `git diff`**, not
from its own report.

### Models

Run `agy models` for the live list. As of 2026-09-06 it offers:

| Model                                                                  | Use for                                                                                       |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `gemini-3.1-pro-high`                                                  | The default for delegated work — docs, scaffolding, bulk edits.                               |
| `gemini-3.8-flash-high` / `-medium` / `-low`                           | Trivial mechanical passes where speed matters more than care.                                 |
| `gemini-3.7-flash-high` / `-medium` / `-low`                           | Older flash tier; prefer 3.8.                                                                 |
| `gemini-3.6-flash-high` / `-medium` / `-low`                           | Older flash tier; prefer 3.8.                                                                 |
| `gemini-3.1-pro-low`                                                   | Cheap pro-tier pass (note: `gemini-3.1-pro-medium` does not exist — only `-high` and `-low`). |
| `claude-sonnet-4-6`, `claude-opus-4-6-thinking`, `gpt-oss-120b-medium` | Available, but route Claude-model work through the `Agent` tool instead.                      |

`agy` does not commit. The orchestrating agent stages and commits its output.

## Muse Code (Meta) — fast module ports that you must verify yourself

Muse is a genuine option for a **well-specified module port**: a bounded chunk
of implementation with an existing reference module to copy, a written contract
to follow, and a mechanical way to check the result. Evaluated 2026-08-07 on the
`mobile-numbers` port (8 routes, ~2,000 lines including tests) against the brief
at `plans/2026-08-07-express-modules-migration/briefs/muse/2026-08-07-mobile-numbers-module-port.md`. It finished
in about five minutes.

**What it got right, unprompted:** the module/layer split, `AppHttpError` with
the exact Python `code` strings, `operationId` preserved, `BigInt` converted in
the serializer, `@/db/client` imported only from the repository, sub-resource
routes declared before `/:id`, and — the part that mattered most — every
ownership check written as a filter inside the loading query
(`findFirst where {id, userId}`) returning 404 rather than a load-then-compare 403. The OpenAPI diff against the FastAPI router came out at 0 differences.

### The one thing that decides how you use it

**Muse cannot run a single command in this container.** Its bash tool is
sandboxed through bubblewrap, and `bwrap` cannot create a namespace here
(`kernel.unprivileged_userns_clone`), so every `pnpm node:typecheck`,
`node:lint`, `node:test`, `node:boundaries`, and `prettier` invocation fails. It
writes the whole module blind. To its credit it says so plainly in its report
rather than claiming green checks — but **the orchestrator owns every
verification**, without exception.

That is exactly where its output failed. Five tests failed on the first run and
all three defects were in the tests, none in the module:

- fixtures expressed expiry relative to a frozen `NOW` constant while the clock
  was never frozen, so against real time every verification was already expired;
- four stacked `mockResolvedValueOnce` values were queued and never consumed,
  and `clearMocks` does **not** drain the once-queue, so they leaked into the
  next test and overrode its stub — silently disabling a cross-user
  authorization assertion, the single most important test in the file;
- an `approve` body used `z.object` where the Pydantic model sets
  `extra="forbid"`.

Every one of those dies on first `pnpm node:test`. So: treat Muse's tests as a
draft that has never been executed, and read them as carefully as the module.

### Invocation

```bash
cd apps/api && muse exec \
  --trust-workspace \
  --reasoning-effort high \
  --prompt-file /workspaces/876/plans/<run>/briefs/muse/<brief>.md
```

- **`--trust-workspace` is required.** Without it Muse reports
  `workspace is untrusted, so [AGENTS.md] is skipped` and runs without the
  project rules. It is a one-line warning that is easy to miss.
- `--reasoning-effort` accepts `none|minimal|low|medium|high|xhigh|ultra`;
  `high` is the default and what was evaluated.
- `--json` emits machine-readable JSONL if you want to watch progress.
- It does not commit, and it respected an explicit "do not touch these files"
  list including the two modules being written concurrently beside it.

**Monitor it at 60–90s, not the 5 minutes used for Codex.** Muse finishes a
whole module in about five minutes, so a five-minute check produces one event
that arrives after the run is already over.

## GPT web — human-relayed, unlimited output, zero execution

A pattern the user drives directly: **you write a brief, the user pastes it into
ChatGPT web (GPT-5.6, high reasoning), and GPT web edits files and pushes to the
branch through its GitHub connector.** It then writes a report; you pull,
verify, fix, and commit.

Reach for it when the work is **large, well-specifiable, and test-hungry** — a
whole platform standard, a cross-cutting refactor, a feature spanning many
phases. The user's GPT quota is effectively unlimited, so the brief can demand
far more tests than you would ask of a metered tool. It is the wrong choice for
anything needing a database, a migration, a live service, or a fast loop.

### The loop

```
you: write plans/<run>/briefs/gpt-web/<date>-<slug>.md, commit it, push the branch
user: pastes the brief into ChatGPT web
gpt web: edits files → commits to the SAME branch → writes its report
you: pull → verify → fix what it could not → commit → write the next brief
```

### What it cannot do — this is the whole risk

**GPT web executes nothing.** No shell, no tests, no typecheck, no lint, no
build, no migration, no database, no running service. Every green check on its
work is yours, and it has never seen one of its own files run.

Measured across two passes on `feat/console-access-control`:

| What it shipped                               | What only execution found                                                                      |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| A correct Prisma migration                    | The client was never regenerated — 18 typecheck errors across guards and services              |
| A new `{ data, error }` envelope on a service | A caller still read `.userId` off it, so a rejected grant dereferenced null                    |
| 8 new component tests                         | Console's vitest environment is `node`, so not one of them had ever executed                   |
| A route-guard suite                           | It lived in `src/lib/` and imported route code — a boundary violation lint had been failing on |
| A permission catalog                          | Six permissions its own navigation required were granted by **no role at all**                 |
| Test fixtures                                 | Missing required fields, papered over with `as any`; `BigInt` literals the ES target rejects   |

None of that is sloppiness — it is the direct, predictable consequence of
writing code you cannot run. Budget review time accordingly, and **never
merge its work on the strength of its report.**

### Verify premises before you assert them

A brief is not evidence, and GPT web will (correctly) refuse to build on a false
one. Both times a premise in a brief was wrong, it stopped and said so:

- A brief claimed no batch employee-profile verb existed. One did. It had
  looked, not found it, and declined to invent one — the right call, but the
  brief had sent it looking in the wrong place.
- The next brief asserted the platform returned multivariate flag variants.
  It does not: `apps/api/src/providers/posthog/flags.ts` returns
  `Map<string, boolean>` and collapses every value with `value !== false`.
  GPT web read the provider, found the contradiction, and skipped the phase
  rather than inventing variants or calling PostHog directly from Console.

So: **grep the facade, read the provider, and check the route before writing a
premise into a brief.** A verified premise is worth more than another page of
instructions, and an unverified one costs a whole phase.

### What the brief must contain

Beyond the normal briefing format, a GPT web brief needs:

1. **A hard "you must not" list.** No branch creation, rename, delete, merge, or
   rebase — one branch only. No pull requests. Never touch `main`. No shell
   commands, and never write "tests pass" — write "not executed; verification is
   the orchestrator's". No `prisma migrate`; hand-write the migration SQL to a
   named path instead. No `eslint-disable`, no `as any` (use `as unknown as T`),
   no AI attribution in commit messages.
2. **Per-phase test floors, as numbers.** It will meet them, and it treats a
   phase below its floor as incomplete. There is no budget reason to be shy.
3. **An explicit prohibition on weakening production code for testability.**
   Without it, `searchParams` becomes optional and a `ResourceToolbar`
   disappears so a test can render the page more easily. This happened, and had
   to be reverted.
4. **The rule that a declared permission must be granted.** Anything it adds to
   a catalog or a navigation requirement must name the role that holds it.
   A permission nothing grants is indistinguishable from one that does not exist.
5. **A named escape hatch for anything it cannot do safely.** Its GitHub writer
   replaces whole files, so a one-line insertion into a large file is genuinely
   dangerous for it. Tell it to skip and report instead — it will, honestly,
   rather than reconstructing the file and truncating it.
6. **A concurrency note** when another agent is in the same tree: pull before
   starting and before its final commit, never delete another agent's test
   files, integrate rather than replace inside shared directories.
7. **The exact verification commands you will run**, so it knows what its output
   must survive.

### Its report is the deliverable you actually read

Require a report at `plans/<run>/reports/gpt-web/<date>-<slug>.md`, committed with
the work, containing: a per-phase status table with the **counted** number of
`it()` cases added in that pass; every file changed with a reason; any migration
in full; decisions the brief did not settle; **things it could not verify**;
gaps deliberately left; risk notes; and the verification commands.

Its reports have been consistently honest — the sections where it refused to
claim unverified work were the most useful part. Reinforce that: tell it a
truthful "not executed" beats a confident claim, and that a fabricated test
count is worse than a missing phase.

### A connector timeout is not a spent budget

GPT web reaches GitHub through a connector, and that connector fails
transiently. Observed repeatedly: a tool timeout, a rate-limit response, or a
temporary connector error gets read as "GitHub access is exhausted", and the
run abandons an operation it was one retry away from completing.

Put this in the brief, because the model will not assume it:

1. Retry the same read or write after a short gap.
2. If it fails transiently again, retry at least once more while the operation
   is still needed.
3. **Preserve the exact reference the retry needs** — repository, branch, PR
   number, SHA, workflow run id, job id, file path — rather than dropping it
   along with the failed attempt.
4. Call an operation blocked only when repeated retries give a _stable_
   non-transient answer: a real permission denial, an unsupported endpoint, a
   missing resource, or a reproducible service-side failure.
5. **Distinguish a connector failure from an Actions runner failure.** A
   workflow job that reports an empty step list and has no log because it never
   started is a CI execution problem. It says nothing about the connector, and
   retrying the connector will not fix it.

The same brief should name the run's durable references — repo, branch, PR — in
one place, so a retry after a failure has something to retry _against_.

### Reviewing what comes back

Pull, then in this order:

```bash
git log --oneline <base>..HEAD          # what it actually committed
git diff --stat <base>...HEAD
grep -rn "eslint-disable\|as any" <paths it touched>
pnpm --filter <pkg> typecheck           # expect failures; regenerate clients first
pnpm --filter <pkg> lint
pnpm --filter <pkg> test                # check the COUNT moved, not just green
node scripts/check-app-structure.mjs
```

Then look specifically for the failure modes above: a stale generated client, a
suite it left behind after changing a shape it did not own, a permission nothing
grants, a test that never ran because of its environment, and any production
signature it loosened to make a test easier.

**It pushes while you work.** Fetch before you commit, `git rebase` onto its
commits, and never force-push over them.

## Briefing the free tier — they read too much

Cline (and to a lesser degree opencode and Command Code) **spends most of a run
reading**: watched manually on 2026-09-14, a Cline run on a one-page settings
brief read files for ~15 minutes and wrote three small files before stopping.
A brief that says "read the reference implementation" invites it to read the
whole subtree. For the free tier the brief must do the reading for it:

- **Name every file to create or edit, by exact path**, and every file to copy
  from — no globs, no "look around".
- **Paste the short excerpts it needs** (the import lines, the props of the
  shared component, the route-handler skeleton) instead of pointing at a file.
- Give a **read budget**: "read at most these N files, then start writing".
- Order the work so the **first deliverable is written early** (the page file
  before its tests), so a run that stalls still leaves something reviewable.
- Keep each brief to **one PR-sized unit**; split anything larger across runs.
- Require the report file; a run that ends without one did not finish.

## Cline — free pool #1

```bash
cline -c /root/projects/876 -m <model> --thinking none -t 3600 \
  "$(cat plans/<run>/briefs/cline/<brief>.md)" < /dev/null > /dev/null 2>&1
```

- `--thinking none` for speed; models with mandatory reasoning (Muse) take
  `--thinking low`.
- `-c <dir>` working directory, `-t <secs>` hard timeout (always set),
  `< /dev/null` so it never waits on stdin.
- Harmless noise: `error: hook dispatch failed: session.hook requires a valid hook event payload`.
- `cline config` and other subcommands need a TTY.

Free models (2026-09-14, each has its own **daily limit** — rotate):

| Model id                                | Notes                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------- |
| `cline-free/deepseek-v4.1-flash`        | fast, 1M context; the default                                             |
| `cline-free/muse-spark-1.3-contributor` | strongest free coder; hit its daily limit on 2026-09-14; `--thinking low` |
| `z-ai/glm-5.3-flash`                    | fast multimodal                                                           |
| `cline-free/solar-pro4`                 | documents and coding                                                      |
| `poolside/laguna-s-2.1:free`            | coding agent                                                              |

The roster rotates; read the live list instead of trusting this table:

```bash
cd "$(npm root -g)/cline" && node --input-type=module -e \
  "import('@cline/core').then(async m => console.log((await m.fetchClineRecommendedModels()).free.map(x => x.id)))"
```

Probe a model (≈2 s, costs nothing): add `--json "Reply with OK" | tail -1` and
read `run_result.finishReason` / `text`. A limit shows as an error result.

## opencode — free pool #2

```bash
opencode run -m opencode/<model> [--variant <low|medium|high|max>] --auto \
  "$(cat plans/<run>/briefs/opencode/<brief>.md)" < /dev/null > /dev/null 2>&1
```

Free models (2026-09-14): `opencode/muse-spark-1.3-contributor-free`,
`opencode/muse-spark-1.2-contributor-free`, `opencode/big-pickle`,
`opencode/mimo-v2.5-free`, `opencode/nemotron-3-ultra-free`,
`opencode/nemotron-3.5-lightning-free`, `opencode/ling-3.0-flash-fin-free`.
List live: `opencode models | grep -i free`.

- muse-spark-1.3 at `--variant max` delivered the Couriers settings sidebar and
  users/roles split (69 tests) cleanly on 2026-09-14 — the best free option for
  UI work when its quota is available.
- `--dangerously-skip-permissions` and `-q` do not exist on this CLI.

## Command Code — prepaid pool, use it up

```bash
command-code -p --yolo --skip-onboarding -m deepseek/deepseek-v4.1-flash \
  --max-turns 150 "$(cat plans/<run>/briefs/command-code/<brief>.md)" < /dev/null > /dev/null 2>&1
```

- The user pays $1/month for **extremely generous DeepSeek V4.1 Flash** usage.
  Treat it as the default workhorse for every cheap task the free pools cannot
  take, and for parallel mechanical sweeps split by file set.
- Other useful models on the same plan: `deepseek/deepseek-v4-pro` (more
  reasoning), `moonshotai/kimi-k3`, `zai-org/glm-5.3`, `qwen/qwen3.8-max`, and the
  free ones `meituan/longcat-2.0:free`, `poolside/laguna-s-2.1-free`.
  `command-code --list-models` shows all ~70 (it also lists Claude, GPT and
  Gemini models — do not route premium models through it without asking).
- `--max-turns` defaults to 100 and exits 8 at the cap; raise it for real work.
- `--effort low|medium|high` where the model supports it.
- Never use `-w/--worktree` (no worktrees for delegates).
- Probe: `command-code -p "Reply with OK" -m <model> --max-turns 1 --skip-onboarding < /dev/null`.

## Never redirect a delegated run's stdout to a file in the repo

**Do not do this:**

```bash
codex exec -m gpt-5.6-terra "$(cat brief.md)" > plans/<run>/reports/codex/phase2-run.log 2>&1 &
```

A single Codex or `agy` run emits roughly **20,000 lines** — it echoes the brief,
every rule file it loads, every tool call, and every file it reads. Measured on
2026-09-05: seven runs produced **3.9 MB** of transcripts, the largest a single
1.1 MB file, and three were committed before anyone noticed.

Two costs, both severe:

1. **It poisons the orchestrator's context.** Any later `cat`, `tail`, or even a
   `grep` with loose anchors pulls thousands of lines of echoed rule text into
   the window. The user hit exactly this and had to stop the session.
2. **It bloats the repository permanently.** `plans/` is committed on purpose
   (`.claude/rules/implementation-tracker.md`), so a transcript committed once is
   in history forever.

`plans/**/*-run.log` is gitignored. Do not add an exception, and do not rename
around it.

### What to do instead

- **Let the transcript go to the harness.** `run_in_background: true` on the
  Bash tool already captures stdout to a temp path outside the repo. That is the
  only copy anyone needs, and it is the one to read if a run genuinely misbehaves.
- **The deliverable is the delegate's report `.md`**, which every brief must
  require: files changed, decisions, counted test numbers, verification output,
  and what could not be verified. Read that, not the transcript.
- **Judge the work by the diff and your own verification**, never by the
  transcript. `git status`, `git diff`, and running the checks yourself are the
  acceptance gate — `.claude/rules/cli.md` already says a delegation you never
  inspect is not delegation, and the transcript is not the inspection.
- If you must keep a transcript for one debugging session, write it to `/tmp`,
  never under `plans/` or anywhere else in the working tree.

**Never `cat` or `tail` a delegated run transcript into your context.** If you
need something from it, `grep` with a tight anchor and a hard `head -n`, and
prefer the report.

## Shared rules across all delegated CLIs/sub-agents

- **Never let a delegated CLI or sub-agent commit.** The orchestrating
  Claude agent stages and commits, per `.claude/rules/git.md` (no AI
  attribution).
- **Background execution is authorized** (user, 2026-07-26: _"run codex in the
  background always going further"_, refined to _"in the background only if they
  make sense, you make that decision"_). This is the written authorization the
  root `CLAUDE.md` "Sub-Agent Rules" exception requires. Judgement still
  applies: background genuinely long-running work (a Codex run, a CI/checks
  poll) and keep quick checks in the foreground, where the result is available
  immediately. Backgrounding a two-second command costs a round trip and buys
  nothing. Whatever the mode, you still **read and verify the output** — a
  backgrounded delegation you never inspect is not delegation.
- **Verification commands run in the FOREGROUND. Always.** `typecheck`, `lint`,
  `test`, `prettier --check` — never `run_in_background`, never a background
  wait-loop, no matter how slow they are. Background them and the result arrives
  as a notification you may not act on, so you end up reporting "still waiting"
  turn after turn with no actual information, and in the worst case narrating a
  pass that never happened. The user named this directly on 2026-08-03: _"when
  those check[s] run in the background they cause you to hallucinate and not
  wake up or monitor sometimes."_ It is not hypothetical — that same session,
  a backgrounded couriers typecheck sat unread while stale Next route types
  masked a real failure, which surfaced within seconds of running it in the
  foreground.

  A foreground run blocks the turn, which is the point: the exit status and the
  output are in front of you before you say anything about them. Pass a generous
  `timeout` (the console and couriers suites need 300000–420000 ms) rather than
  reaching for the background to dodge a timeout. If a command genuinely cannot
  finish in the maximum foreground timeout, split it (one package at a time)
  instead of backgrounding it.

  This applies to your own verification and to re-verifying a delegated tool's
  work. Backgrounding remains correct for the delegated _run itself_ (a `codex
exec`), for CI polling, and for a long-lived dev server — things that are not
  a pass/fail gate you are about to report on.

- **Every backgrounded Codex run gets a 5-minute monitor, started in the same
  turn that launches it.** Not on request — automatically, every time.

  ```bash
  # Immediately after the `codex exec … &` / run_in_background launch.
  # Note the bracket in "cod[e]x": the monitor's own command line contains the
  # pattern, so a literal "bin/codex" matches the monitor itself and it reports
  # "still running" forever, long after the run has exited. This is not
  # hypothetical — it happened on 2026-08-02.
  Monitor(
    command: 'while true; do sleep 300;
      if pgrep -f "bin/cod[e]x" >/dev/null 2>&1; then
        echo "[$(date -u +%H:%M)] codex still running — $(git status --short | wc -l) files changed";
      else echo "[$(date -u +%H:%M)] codex EXITED"; break; fi; done',
    description: '<what the run is doing>, 5-min checks',
    timeout_ms: 3600000,
  )
  ```

  The harness does notify on exit, so the monitor is not what tells you the run
  finished — it is what tells you the run is **alive and progressing** while it
  is still going, which the exit notification cannot do. Do not argue the point
  or offer the exit-notification reasoning instead of starting the monitor;
  that response has been rejected repeatedly. Match the `pgrep` on the binary
  path (`bin/codex`), never on the prompt text — a pattern that matches the
  monitor's own command line hangs forever.

- Scope parallel tasks (Codex, `agy`, `opencode`, Command Code, or Claude
  sub-agents) to non-overlapping file sets; run overlapping areas
  sequentially.
- Give every delegated task the exact verification command
  (`pnpm --filter <pkg> typecheck/test`) and an explicit file scope — never
  a vague "go improve X."

## Implementation runs live in `plans/<run>/`, tracked in git

Every implementation run, feature pass, PR, or delegated multi-agent orchestration
**must be saved under its own dedicated directory in `plans/<date>-<feature-slug>/`**
— never dumped flat across disparate tool silos, never composed only inline in a shell
command, and never left solely in conversation history.

```text
plans/<date>-<feature-slug>/
├── plan.md                 # Primary implementation plan, architecture decisions, task checklist, handoff state
├── briefs/                 # Dispatched briefs (subdirectories per tool: codex/, agy/, muse/, gpt-web/, sub-agent/)
└── reports/                # Returned reports (subdirectories per tool: codex/, agy/, muse/, gpt-web/, orchestrator/)
```

- **Per-implementation folder:** Name each folder using ISO date and kebab-case descriptor,
  e.g. `plans/2026-09-02-billing-and-invoice-list-detail-split/` or
  `plans/2026-08-30-bounded-service-clients/`.
- **Standard `plan.md` in every run:** Maintain a single source of truth for the
  feature's scope, decisions, task checklist (`[ ]` / `[x]`), verification commands,
  and multi-session handoff state. See `.claude/rules/implementation-tracker.md`.
- **Subdirectories per delegated tool:** Under `briefs/` and `reports/`, organize files by
  the tool/delegate (`briefs/codex/`, `briefs/agy/`, `briefs/muse/`, `briefs/gpt-web/`,
  `briefs/sub-agent/`, `briefs/opencode/`, `briefs/command-code/`). Name each file for the specific
  task it briefs, e.g. `briefs/codex/2026-09-02-billing-remaining-list-detail-split.md`.
- **Durable multi-session continuity:** When an orchestration run is long or spans multiple
  sessions/agents, the folder preserves the complete state. An incoming agent (Claude, Gemini,
  Codex, Cursor) can read `plan.md`, review prior briefs and reports, verify progress, and
  author the PR description seamlessly.
- **Always committed in git — never gitignore `plans/`:** Unlike transient scratch
  files, implementation runs are the durable audit trail of architectural intent, delegated tasks,
  and verification reports. Commit the implementation folder alongside the code changes it produced.
- **Write briefs to disk before invoking:** Write the brief file first, then pass its path
  or content into the CLI or sub-agent invocation (`cat plans/<run>/briefs/...`).
