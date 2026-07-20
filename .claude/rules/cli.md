# Sub-Agent & CLI Model Routing

Read this before spawning any sub-agent or driving any external CLI (Codex,
`agy`, `opencode`, Command Code) for a delegated chunk of work. It defines
**which model/tool handles which class of task**, and how to invoke each CLI
non-interactively. See `.claude/rules/implementation-tracker.md` for tracking
multi-file delegated work, and the root `CLAUDE.md` "Sub-Agent Rules" section
for the foreground-only rule (never background a sub-agent).

## Routing table

| Task class                                                                                                                            | Model / tool                                                                                                       | Execution mode                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Code exploration / research (find files, trace a symbol, map a subsystem before implementing)                                         | **Sonnet, high reasoning**                                                                                         | Sub-agent (`Agent` tool, `model: sonnet`), detailed brief (below)                                    |
| Advanced/critical implementation (cross-cutting, architecturally sensitive, hard bugs)                                                | **Opus, high reasoning**                                                                                           | Sub-agent (`Agent` tool, `model: opus`)                                                              |
| General updates (routine feature work, moderate scope, not exploration or high-stakes design)                                         | **Opus, medium reasoning**                                                                                         | Sub-agent (`Agent` tool, `model: opus`)                                                              |
| Design decisions / highest-stakes or security-sensitive code (auth, key handling, provisioning, anything that must simply be _right_) | **Fable, high reasoning**                                                                                          | **Direct execution by the primary agent — never a sub-agent.** See "Fable is never delegated" below. |
| Docs-only work (`.md`/`.mdx`, OpenAPI `docs.py` prose, README, rule files)                                                            | **`agy`, Sonnet 4.6 Thinking** (existing) **or** `opencode`/Command Code with **DeepSeek V4**                      | Foreground CLI                                                                                       |
| Trivial / mechanical / mass-simple edits (rename a function and fix every call site, bulk find-replace, boilerplate scaffolding)      | **`opencode`** (or Command Code) with **DeepSeek V4** — orchestrate multiple in parallel for independent file sets | Foreground CLI                                                                                       |

**Reasoning-effort note:** the `Agent` tool's `model` parameter only selects
the model (`sonnet` / `opus` / `haiku` / `fable`) — it has no separate
"reasoning effort" dial the way `codex exec -c model_reasoning_effort=` or
`opencode run --variant` do. For Claude sub-agents, express the desired
depth in the brief itself: tell an exploration sub-agent to "search
exhaustively, check every call site, read full files, cite `file:line` for
every claim" for a high-effort pass; tell a general-update sub-agent to
"make the obvious, scoped change without re-deriving the whole subsystem"
for a medium-effort pass. The model choice (Sonnet vs Opus vs Fable) is the
primary lever; the brief's thoroughness instructions are the secondary one.

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

## Codex (`gpt-5.5`) — existing convention, unchanged

See the root `CLAUDE.md` "Sub-Agent Delegation (Codex)" section for the
60/40 Claude-led/Codex-assisted workflow, briefing format, and the
`codex exec` invocation. Codex remains the default for non-trivial
well-scoped implementation chunks that don't need Opus/Fable-level judgment.

## `agy` (Antigravity) — docs, unchanged

See root `CLAUDE.md` "Antigravity (`agy`) Delegation". Model:
`Claude Sonnet 4.6 (Thinking)`. Reserved for documentation and Markdown work;
does not commit.

## `opencode` — trivial/mechanical work and docs, DeepSeek V4

Use `opencode` for mass-simple, low-risk edits: renaming a function and
updating every call site, bulk mechanical refactors, boilerplate scaffolding,
and docs when `agy` isn't a better fit. Prefer **DeepSeek V4** models:

```bash
opencode run -m deepseek/deepseek-v4-pro --variant <low|medium|high> \
  --dangerously-skip-permissions -q "<task prompt>" < /dev/null
```

- `deepseek/deepseek-v4-pro` for anything needing real reasoning (a
  multi-file rename with type-checked call sites); `deepseek/deepseek-v4-flash`
  for pure mechanical find-replace with no ambiguity.
- `--variant` sets reasoning depth (`low`/`medium`/`high`) — use `medium` for
  most mechanical work, `high` only if the mechanical change has edge cases
  (overloads, shadowed names) worth reasoning about.
- `-q` / `--quiet` suppresses the spinner — always use it for scripted/CLI
  driving so output stays parseable.
- Always redirect `< /dev/null` so opencode never blocks on stdin.
- The stealth free model `opencode/big-pickle` (GLM-4.6, 200k context) is an
  acceptable substitute for DeepSeek V4 on the same trivial/docs tier when
  available — `opencode run --model opencode/big-pickle "<prompt>"` — but
  DeepSeek V4 is the default choice per this rule.
- Give each `opencode` task an explicit file scope and the verification
  command (`pnpm --filter <pkg> typecheck`); scope parallel tasks to
  non-overlapping files exactly like Codex briefs.

## Command Code — alternative CLI for trivial work and docs, DeepSeek V4

Command Code (`commandcode.ai`) is an equivalent alternative to `opencode`
for the same trivial-mechanical/docs tier, supporting DeepSeek V4 among other
providers. Drive it headlessly:

```bash
command-code -p --yolo -m deepseek/deepseek-v4-pro "<task prompt>" < /dev/null
```

- `-p` / `--print` runs headless mode: executes once, prints to stdout, exits
  — the non-interactive form to use from scripts/orchestration.
- `--yolo` (equivalent in intent to Codex's
  `--dangerously-bypass-approvals-and-sandbox`) skips permission prompts so
  file writes/edits/shell commands aren't blocked. **Only use it in this
  repo's workspace-write context, never against untrusted input.**
  `--dangerously-skip-permissions` is the more explicit alias if `--yolo`
  is unavailable in the installed version — check `command-code --help` if
  either flag errors.
- Always redirect `< /dev/null`.
- Same non-overlapping-file-scope and no-commit rules as Codex/`opencode`.

## Shared rules across all delegated CLIs/sub-agents

- **Never let a delegated CLI or sub-agent commit.** The orchestrating
  Claude agent stages and commits, per `.claude/rules/git.md` (no AI
  attribution).
- **Never run any of these in the background** — root `CLAUDE.md`'s
  "Sub-Agent Rules" foreground-only requirement applies to all of them, not
  just Codex/`agy`.
- Scope parallel tasks (Codex, `agy`, `opencode`, Command Code, or Claude
  sub-agents) to non-overlapping file sets; run overlapping areas
  sequentially.
- Give every delegated task the exact verification command
  (`pnpm --filter <pkg> typecheck/test`) and an explicit file scope — never
  a vague "go improve X."

## Briefs live in `.claude/briefs/`, tracked in git

Every written brief for a delegated CLI or sub-agent (Codex, `agy`,
`opencode`, Command Code, or a Claude `Agent` sub-agent) **must be saved as a
file under `.claude/briefs/`** — never composed only inline in a shell
command or left to exist solely in conversation history.

- **Organize by tool and task, not dumped flat.** Use a subdirectory per
  delegated tool (`.claude/briefs/codex/`, `.claude/briefs/agy/`,
  `.claude/briefs/opencode/`, `.claude/briefs/command-code/`,
  `.claude/briefs/sub-agent/`), and name each file for the task it briefs,
  e.g. `.claude/briefs/codex/2026-07-18-couriers-org-bootstrap.md`. Do not
  let briefs accumulate as an unsorted pile of `brief1.md`, `brief2.md`.
- **Do not gitignore `.claude/briefs/`.** Unlike `.claude/tracker/` (local,
  ephemeral, gitignored per `.claude/rules/implementation-tracker.md`),
  briefs are committed and versioned — they are the durable record of what
  was asked of a delegated tool and why, and later work (or another agent)
  may need to see exactly what a prior brief specified.
- Write the brief file first, then pass its content (or path, if the tool
  accepts a file argument) into the `codex exec` / `opencode run` /
  `command-code -p` / `Agent` invocation — do not skip the file and only
  paste the prompt inline.
- Commit brief files in the same logical commit as the work they produced,
  or their own `chore(briefs): ...` commit if the delegated work spans
  multiple commits — never leave a brief uncommitted alongside committed
  output.
