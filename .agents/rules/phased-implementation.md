# Phased Implementation

Read this before starting any feature large enough to span more than two or three
pull requests. It defines how multi-phase work is **broken down, tracked,
delegated, verified, and documented**.

It is the orchestration layer on top of three existing rules and does not repeat
them:

- `.agents/rules/git.md` — the integration-branch mechanics (branching, merge
  subjects, stacked phases, the final `main` PR).
- `.agents/rules/cli.md` — which model or CLI handles which class of work, and
  the briefing format.
- `.agents/rules/implementation-tracker.md` — the local, gitignored tracker.

The short version: **cut an integration branch, file the phases in Linear with a
Haiku sub-agent, write a brief per phase, delegate per `cli.md`, review every
delegated output yourself, merge each phase into the integration branch as it
goes green, then verify the merged branch before opening one PR to `main`.**

## When this applies

Use a phased implementation when **any** of these is true:

- the work spans more than two or three pull requests;
- it introduces a shared package or a cross-app abstraction;
- it touches schema, service, route, and UI layers together;
- it needs delegation to more than one agent or CLI.

A self-contained change branches from `main` and targets `main`, as normal. Do
not build this scaffolding around a two-file fix.

## Breaking the work into phases

Phases are cut along **dependency order**, so each one is independently
reviewable and independently green. The default shape, which most features fit:

| #   | Phase             | Contents                                                                                 | Typical owner                                        |
| --- | ----------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| 1   | **Contract**      | Shared types, validation, pure logic. No consumers yet.                                  | Codex                                                |
| 2   | **Storage**       | Schema, migration, catalogs/registries built on the contract.                            | Codex                                                |
| 3   | **Service**       | Service verbs over the datastore, plus thin route handlers.                              | Codex                                                |
| 4   | **Critical path** | Auth, permissions, provisioning, seeding, deletion — anything that must simply be right. | **The primary agent, directly**                      |
| 5   | **Surface**       | Pages, navigation, components.                                                           | agy for scaffolding, primary agent for the IA itself |
| 6   | **Documentation** | The rule this feature establishes, mirrored to all three trees.                          | Primary agent writes, agy mirrors                    |

Rules for cutting phases:

- **Each phase must pass its own verification on its own.** If phase 2 cannot be
  green without phase 3, they are one phase.
- **Phase 1 is always the contract when there is one.** Building storage first
  means the contract gets retrofitted to the schema instead of the reverse.
- **The security-sensitive phase is never delegated.** See `cli.md`.
- **Documentation is its own phase, not a footnote.** A feature that establishes
  a pattern is not finished until the pattern is written down.
- **Phases that touch the same file run sequentially**, never in parallel. Two
  agents editing one service index is a guaranteed conflict.

## Linear is the durable record across runs

An agent session ends and its reasoning is gone. The repo keeps _what_ the code
does; git history keeps _what changed_. **Linear is where the platform keeps
_why_** — the decisions, the alternatives that were rejected, the approaches that
failed, and the follow-ups that were deliberately left. Treat it as the shared
long-term memory every future run reads from, not as a status board.

### Read Linear before you start

**Before planning any non-trivial work, search Linear for prior issues on the
same surface and read them.** A future run that skips this will re-derive
decisions that were already made and may quietly reverse them.

Send a Haiku sub-agent to search and summarise (`list_issues` with a query,
`list_documents`, then `get_issue` plus `list_comments` on the hits). Ask it for:

- prior decisions on this surface and the stated reasoning;
- anything explicitly marked as a known follow-up or deliberately not built;
- approaches that were tried and abandoned, and why;
- the issue identifiers, so the new work can cite them.

If the search finds nothing relevant, say so in the plan. "No prior art in
Linear" is a useful finding; silence is not.

### Record decisions when they are made, not at the end

A decision written up hours later loses the alternatives that were live at the
time. Post it to the parent issue as it is taken, in this shape:

```
**Decision:** Preference rows are never written when the value equals the default.
**Why:** Storing defaults freezes them — changing a default later would silently
apply to no existing org.
**Alternatives rejected:** Write every key at provisioning time (simpler reads,
but permanently freezes defaults); write defaults lazily on first edit (same
problem, later).
**Supersedes:** none.
**Refs:** PR #96, `.agents/rules/module-settings.md`.
```

Four things make this worth writing: the decision, the **why**, the alternatives
that were rejected, and what it supersedes. A decision recorded without its
rejected alternatives reads later as arbitrary, and the next agent re-litigates
it.

### Cite prior work explicitly

When new work builds on, changes, or reverses an earlier decision, **name the
issue** (`1876-8`) in the new issue's description and in the commit or PR body
where it matters. A decision that silently contradicts an earlier one is the
worst outcome — the reasoning for both is lost.

When a decision is reversed, comment on the **original** issue saying so and
pointing forward. Leaving a stale decision as the top hit for a future search is
how a fixed mistake gets reintroduced.

### Record what failed, not only what shipped

Failed approaches are the most expensive knowledge to regenerate and the least
likely to be written down. Record on the parent issue:

- an approach that was tried and abandoned, and the symptom that killed it;
- a tool or CLI trap that cost real time;
- an environment constraint discovered the hard way.

If the lesson is durable and repo-wide, promote it into a rule file as well —
Linear for this feature's history, a rule for the standing behaviour.

### What goes where

| Where                                  | What                                                                   | Lifetime                          |
| -------------------------------------- | ---------------------------------------------------------------------- | --------------------------------- |
| **Linear issue/comment**               | This feature's decisions, rejected alternatives, failures, follow-ups. | Permanent, searchable across runs |
| **Rule file** (`.agents/rules/`)       | Standing behaviour every future change must follow.                    | Until the rule changes            |
| **PR description**                     | The reviewable narrative for this change set.                          | Tied to the diff                  |
| **Local tracker** (`.agents/tracker/`) | Scratch checklist for the current session.                             | Disposable, gitignored            |

The failure mode to avoid is a decision that exists **only** in a PR
description: PRs are found by diff, not by topic, so nobody searching "why do we
store decimals as strings" will ever find it.

## Linear tracking — always a Haiku sub-agent

**Every phased implementation is tracked in Linear, and that tracking is always
performed by a Haiku sub-agent (`Agent` tool, `model: haiku`).** Do not file or
update issues from the primary agent: it is mechanical MCP work, it is the
cheapest possible delegation, and it keeps a long tool-output transcript out of
the orchestrator's context.

Spawn the tracking sub-agent at these points:

1. **Before planning** — search Linear for prior work on this surface and report
   back what was already decided (see "Read Linear before you start").
2. **At kickoff** — create one parent issue for the feature and one sub-issue per
   phase, citing any prior issues the work builds on.
3. **At each decision point** — post the decision, its reasoning, and the
   rejected alternatives to the parent. Do not batch these to the end; the
   alternatives are only accurate while they are live.
4. **As phases merge** — update statuses and comment the running state.
5. **At completion** — mark the remaining phases done, move the parent to
   In Review, and comment the final summary including what was deliberately not
   built.

Batch _status_ updates. Do not batch _decisions_ — and never spawn a sub-agent
per issue.

### What the tracking brief must contain

The sub-agent starts cold, so the brief must be self-contained:

- **The workspace conventions**, restated: the team, the project taxonomy, the
  type and area labels, and the default status. See the Linear filing
  conventions in memory or `.agents/rules/` for the current values — the
  sub-agent cannot infer them.
- **An instruction to resolve ids rather than guess them** — list the teams,
  projects, labels, and statuses via MCP and use the real ids. Team keys and
  names change; ids do not. A brief that hardcodes an issue identifier will
  silently target the wrong issue.
- **An explicit "do not create new labels or projects"** — only use what exists.
- **A duplicate check** before creating anything.
- **The exact comment body**, written as real markdown with real newlines.
- **Do not touch the repo** — Linear only.
- **Report back the real identifiers**, and say plainly what could not be done.

### What to record on the parent issue

The parent issue is where someone picks this up in six months, so its comments
carry the reasoning, not just the status:

- the integration branch name;
- each merged PR number and what it covered;
- the **design decisions and why**, especially the ones that look arbitrary;
- verification results **from the merged branch**, not the phase branches;
- known follow-ups that were deliberately not built.

## The flow, end to end

0. **Search Linear first** for prior decisions on this surface, via a Haiku
   sub-agent, and fold what it finds into the plan.
1. **Cut the integration branch** from an up-to-date `main` and push it before
   any phase work starts (`git.md`).
2. **File the phases in Linear** with a Haiku sub-agent, citing any prior issues
   this work builds on or supersedes.
3. **Research first** where the work touches a user-facing pattern, an industry
   norm, or a domain you do not own. Defaults invented at a desk are worse than
   defaults taken from how the industry actually works.
4. **Write a brief per phase** into `.agents/briefs/<tool>/<date>-<task>.md` and
   commit it (`cli.md`). Never compose a brief only inline.
5. **Delegate per the `cli.md` routing table.** Background genuinely long-running
   work; keep quick checks in the foreground.
6. **Review every delegated output yourself.** A delegation you never inspect is
   not delegation. Read the diff, run the verification command, and fix what is
   wrong before committing — the orchestrator owns the result, not the delegate.
7. **Commit atomically** with messages that explain what changed and why
   (`git.md`). Generated-file churn goes in its own commit.
8. **Open the phase PR against the integration branch**, never `main`. Stack it
   on the previous phase when it genuinely depends on it, and retarget once the
   parent merges.
9. **Poll CI, then merge with a real merge subject** — the PR title plus
   `(#N)`, never GitHub's default wording.
10. **Update Linear** via the Haiku sub-agent — status, plus any decision taken
    during the phase with its reasoning and rejected alternatives.
11. **When every phase has landed, verify the merged integration branch itself** —
    check it out and run the full verification there. Green phase PRs do not
    prove the merged result is green.
12. **Open one PR to `main`**, written as the document someone reads a year later:
    the problem, the design decisions and their rationale, the security posture,
    reviewer notes, and what was deliberately not built.
13. **Do not open that PR until the feature is actually complete**, and do not
    merge it without the human's say-so.

## Traps that have actually cost time

Each of these has happened in this repo. They are cheap to avoid and expensive to
debug.

- **Never write a `pgrep`/`pkill` guard whose own pattern matches the command
  line it runs in.** `until ! pgrep -f vitest; do sleep 5; done` matches itself
  and never exits. Match a binary path, or wait on the tool's own completion
  signal instead of polling.
- **Do not regenerate the lockfile to add a workspace package.** In a sandbox it
  re-resolves everything and produces thousands of unrelated deletions, which
  `git.md` forbids committing. Hand-add the importer entry and verify with
  `pnpm install --frozen-lockfile`.
- **Check `git status` for churn in packages you never touched.** A `pnpm
install` can trigger a `prisma generate` postinstall in an unrelated app.
  Revert it; it is environment churn, not a change.
- **Do not stack concurrent verification runs.** Polling by launching another
  full test run starves the sandbox and makes everything slower. One run, then
  wait for it.
- **Read a delegated CLI's flag semantics before scripting it.** `agy --print`
  takes the prompt as its _value_ and must come last; written otherwise it
  answers the wrong question, exits 0, and writes nothing — a silent failure that
  looks like success.
- **A delegate reporting "verification passed" is not verification.** It may have
  run against a different working-tree state than the one you are about to
  commit. Re-run it yourself on the final state.

## Reporting to the human

- Report **outcomes, not progress theatre**. When told to complete all phases,
  drive to completion rather than stopping for approval after each one.
- State failures plainly with the output, and say explicitly what was skipped and
  why.
- Never claim a phase is done before its verification has actually passed.
