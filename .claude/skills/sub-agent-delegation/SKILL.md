---
name: sub-agent-delegation
description: How to delegate implementation chunks to Codex (gpt-5.5) and docs work to Antigravity (agy) in this repo — exact non-interactive invocation flags, model choice, and briefing format. Read before running codex exec or agy for a delegated task.
---

# Sub-Agent Delegation (Codex + Antigravity)

Root `CLAUDE.md`'s "Sub-Agent Rules" section has the always-applicable
prohibition (never background a sub-agent) and the model/task routing
summary. This skill has the mechanics: exact commands, split ratio, and
briefing format.

## Sub-Agent Delegation (Codex)

**Claude-led, Codex-assisted workflow (default for non-trivial work — conserves Claude tokens without giving up quality).** Aim for roughly a **60/40 split**: Claude does ~60% (the majority and the harder/design-critical share); Codex (`gpt-5.5`) does ~40% (well-scoped, lower-risk chunks) in parallel. Keep delegating to Codex to stretch the budget _until the usage limit runs low_, but Claude stays the primary author. The division of labor:

1. **Claude** reads enough to understand the task, makes the design decisions, and personally writes the genuinely hard / design-critical / cross-cutting code.
2. **Claude** writes a precise, self-contained brief (reasoning, file scope, data shapes, exact patterns, verification commands) for each delegated chunk.
3. **Codex** executes those briefs in parallel — pass Claude's reasoning INTO the prompt so codex doesn't re-derive it.
4. **Claude** owns final integration: reviews codex output, runs the authoritative typecheck, and fixes.

Scope parallel codex tasks to non-overlapping file sets. Don't over-delegate — Claude should still be doing the larger and harder half of the work.

Drive it non-interactively:

```bash
codex exec --model gpt-5.5 -c model_reasoning_effort=<medium|high> \
  -s workspace-write --dangerously-bypass-approvals-and-sandbox \
  -C /workspaces/876 "<task prompt>" < /dev/null
```

- `model_reasoning_effort=medium` for mechanical/localized edits; `high` for cross-cutting or design-sensitive work.
- Use `gpt-5.5` (the `gpt-5.5-codex` model is **not** available on the ChatGPT-account auth in this environment).
- Always pass `< /dev/null` so codex does not block reading stdin.
- Give each codex task an explicit file scope, the exact commands to verify (`pnpm --filter <pkg> typecheck/test`), and a note to follow `.agents/rules/git.md` (no AI commit attribution) — but **do not let codex commit**; the orchestrator stages and commits.
- Scope parallel codex tasks to non-overlapping file sets to avoid edit conflicts; run overlapping areas sequentially.

## Antigravity (`agy`) Delegation

- **Delegate documentation and Markdown work to the `agy` CLI; Claude keeps the hard code.** Docs, READMEs, `.md`/`.mdx` content, rule files, changelog/PR prose, and OpenAPI-doc text are well-scoped for `agy`. Claude focuses on design-critical and cross-cutting code (API/auth/data-model changes), reserving its budget for that.
- Use **`Claude Sonnet 4.6 (Thinking)`** as the `agy` model.
- Drive it non-interactively, never blocking on stdin:

  ```bash
  agy --model "Claude Sonnet 4.6 (Thinking)" --dangerously-skip-permissions \
    -p "<self-contained docs task: file scope, intent, constraints>" < /dev/null
  ```

- Give each `agy` task an explicit file scope and the surrounding context (the why), the same way Codex briefs are written. Do **not** let `agy` commit — the orchestrator (Claude) stages and commits per `.agents/rules/git.md`.
