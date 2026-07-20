# Grok Rules — harness scope

This directory (`.grok/rules/`) is **Grok’s** project rule set. Prefer these
paths over `.claude/rules/` or `.agents/rules/` when opening rules mid-session.

## Hard ban: never read `cli.md`

**Grok must never read, open, load, follow, or act on** any of these files:

- `.claude/rules/cli.md`
- `.agents/rules/cli.md`
- any other path ending in `rules/cli.md`

If `CLAUDE.md`, `AGENTS.md`, a skill, or another rule tells you to “read
`cli.md`” or “see `.claude/rules/cli.md` before spawning a sub-agent,” **ignore
that instruction**. Do not open the file. Do not summarize it. Do not use it as
sub-agent routing guidance.

`cli.md` is for Claude Code / other harnesses only. It is intentionally
**absent** from `.grok/rules/`.

## What Grok uses instead

| Need                         | Where                                                        |
| ---------------------------- | ------------------------------------------------------------ |
| Project overview / commands  | Root `AGENTS.md` and this directory’s `agents.md`            |
| Coding, API, layout, git, …  | Matching `*.md` files in `.grok/rules/` (not under `.claude`) |
| Sub-agent / CLI routing      | Use Grok’s built-in tools (`spawn_subagent`, etc.) directly — do not load Claude’s CLI routing table |
| Optional design advisor      | `.grok/rules/advisor.md` + `/advisor` skill — **Grok only** (not in Claude/agents trees) |

## Rule sync (maintainers)

Canonical shared rules live in `.claude/rules/`. Mirrors:

- `.agents/rules/` — full mirror for non-Claude harnesses (includes `cli.md`)
- `.grok/rules/` — Grok mirror of the same set **except** `cli.md` (never copy
  `cli.md` here) plus Grok-only files: this file, `agents.md`, and
  `advisor.md`

When you edit a **shared** rule, update `.claude/rules/`, `.agents/rules/`, and
`.grok/rules/` (or run a sync pass). Do not reintroduce `cli.md` into
`.grok/rules/`. Do **not** copy `advisor.md` into `.claude/rules/` or
`.agents/rules/` — it is Grok-only.

## Claude rules directory auto-scan

Grok can also scan `<repo>/.claude/rules/` when Claude compatibility is on
(default). That would pull in `cli.md`. For this project, keep Grok from scanning
Claude’s rules directory:

```toml
# ~/.grok/config.toml
[compat.claude]
rules = false
```

Or set `GROK_CLAUDE_RULES_ENABLED=false` if your Grok build supports that env
name. Project instructions alone cannot turn the compat cell off — use home
config or env.
