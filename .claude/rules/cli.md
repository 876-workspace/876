# Sub-Agent & CLI Model Routing

Read this before spawning any sub-agent or driving any external CLI (Codex,
`agy`, `opencode`, Command Code) for a delegated chunk of work. It defines
**which model/tool handles which class of task**, and how to invoke each CLI
non-interactively. See `.claude/rules/implementation-tracker.md` for tracking
multi-file delegated work, and the root `CLAUDE.md` "Sub-Agent Rules" section
for the background-execution rule.

## Available tooling — verified, do not re-probe

This inventory exists so a session knows what it can reach **without spending
turns probing**. Trust it; re-verify only if a command actually fails.

| Tool                    | Command                                    | Auth state            | Notes                                                                                                                                                                                                                                                                                                                                      |
| ----------------------- | ------------------------------------------ | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Codex**               | `codex exec -m gpt-5.6-terra`              | ready                 | The model id is **`gpt-5.6-terra`**, run at `model_reasoning_effort=high` (both are already the defaults in `~/.codex/config.toml`). `~/.codex/config.toml` sets `approval_policy = "never"`, `sandbox_mode = "danger-full-access"`, and marks `/workspaces/876` trusted, so `--dangerously-bypass-approvals-and-sandbox` runs unattended. |
| **opencode**            | `opencode run -m deepseek/deepseek-v4-pro` | ready                 | Trivial/mechanical tier. See below.                                                                                                                                                                                                                                                                                                        |
| **Command Code**        | `command-code -p --yolo`                   | ready                 | Alternative to opencode, same tier.                                                                                                                                                                                                                                                                                                        |
| **agy** (Antigravity)   | `agy`                                      | ready                 | **High capacity on Gemini models, small and easily exhausted on Claude/GPT models — separate quota buckets.** Check with `agy -p "/quota"` before delegating. Prefer it for high-volume non-critical work, on Gemini. Capable but literal: it needs step-by-step instructions with a worked example, and its output must always be reviewed. Models via `agy models`. |
| **Cloudflare Wrangler** | `npx wrangler`                             | **authenticated**     | OAuth as `raheemforschool@gmail.com`, account `b033115f2e5e7382047b69539b971105`. Scopes include `workers:write`, `workers_scripts:write`, `workers_kv:write`, `workers_routes:write`. Can deploy Workers, read/set secrets, and `wrangler tail` live logs.                                                                                |
| **GitHub CLI**          | `gh`                                       | **authenticated**     | Account `876-workspace`, scopes `repo`, `workflow`, `read:org`, `gist`. Can open/merge PRs, dispatch workflows, read Actions logs.                                                                                                                                                                                                         |
| **Sentry**              | `sentry`                                   | **authenticated**     | v0.38.0 at `~/.local/bin/sentry`, org **`efesto`** (Efesto-Technologies), team `efesto-technologies`. Token auto-refreshes.                                                                                                                                                                                                                |
| ~~sentry-cli~~          | `sentry-cli`                               | **NOT authenticated** | v3.6.2 at `/usr/local/bin/sentry-cli`, **no auth token**. This is a _different, unusable_ binary — always use `sentry`, never `sentry-cli`.                                                                                                                                                                                                |
| **Docker**              | —                                          | **UNAVAILABLE**       | No binary, no daemon. This is why Cloudflare **Container** services (`876-api`, `876-billing-api`, `876-storage-api`) cannot be deployed locally — their image build must run in GitHub Actions.                                                                                                                                           |

**MCP servers** (`.mcp.json`, repo root): `sentry` — HTTP, `https://mcp.sentry.dev/mcp`.

Two traps worth remembering:

- **`sentry` vs `sentry-cli` are not the same tool.** Only `sentry` is
  authenticated. Reaching for `sentry-cli` wastes a turn on an auth error.
- **Never write a `pgrep` guard whose own pattern matches the command line it
  runs in.** `until ! pgrep -f "sentry project create"; do …; done` inside a
  script that then calls `sentry project create` matches _itself_ and hangs
  forever. Match on the binary path instead (e.g. `pgrep -f "bin/codex"`).

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

## Codex (`gpt-5.6-terra`, high effort) — existing convention, unchanged

See the root `CLAUDE.md` "Sub-Agent Delegation (Codex)" section for the
60/40 Claude-led/Codex-assisted workflow, briefing format, and the
`codex exec` invocation. Codex remains the default for non-trivial
well-scoped implementation chunks that don't need Opus/Fable-level judgment.

## `agy` (Antigravity) — high-capacity **Gemini** tier for non-critical work

Antigravity is the default tool for high-volume work that does not need to be
correct on the first try: documentation, Markdown, placeholder scaffolding,
mechanical file generation, and bulk repetitive edits.

**Its capacity is large on Gemini models and small on Claude/GPT models — they
are separate quota buckets.** "Effectively unlimited" was recorded here from the
Gemini experience and is not true of the whole tool. Measured 2026-08-07:

| Bucket                | Weekly | 5-hour |
| --------------------- | ------ | ------ |
| Gemini models         | 95%    | 98%    |
| Claude and GPT models | 7%     | **0%** |

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
    --print "$(cat .claude/briefs/agy/<brief>.md)"
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

Run `agy models` for the live list. As of July 2026 it offers:

| Model                                                                  | Use for                                                                  |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `gemini-3.1-pro-high`                                                  | The default for delegated work — docs, scaffolding, bulk edits.          |
| `gemini-3.6-flash-high` / `-medium` / `-low`                           | Trivial mechanical passes where speed matters more than care.            |
| `gemini-3.5-flash-high` / `-medium` / `-low`                           | Older flash tier; prefer 3.6.                                            |
| `gemini-3.1-pro-low`                                                   | Cheap pro-tier pass.                                                     |
| `claude-sonnet-4-6`, `claude-opus-4-6-thinking`, `gpt-oss-120b-medium` | Available, but route Claude-model work through the `Agent` tool instead. |

`agy` does not commit. The orchestrating agent stages and commits its output.

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
