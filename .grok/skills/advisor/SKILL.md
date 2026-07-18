---
name: advisor
description: >
  Optionally spawn a read-only gpt-5.6-sol advisor (Codex, high reasoning) for
  complex design, architecture, product, or implementation advice. Use when the
  user runs /advisor, asks for a second opinion, or when Grok opts in on
  genuinely complex work — never as a mandatory gate for routine changes.
metadata:
  short-description: 'Optional Codex gpt-5.6-sol high design advisor'
---

# /advisor — gpt-5.6-sol high (read-only, optional)

Run a **foreground, read-only** Codex advisor pass **only when invited**. Do
**not** let the advisor edit, commit, or push.

## Authority

- **Grok (primary) decides whether to call Sol** — default is no advisor.
- **Sol (`gpt-5.6-sol`) advises** — ranked options, trade-offs, risks, citations.
- **Grok decides after** — final call on design and what to implement.
- Treat the memo as strong input, not a binding spec. Grok may adopt, adapt,
  partially follow, or reject Sol’s recommendations when they conflict with
  repo rules, user intent, security, or better judgment — and should **say so
  briefly** (what Sol recommended vs what Grok will do and why).

## When to run

1. User runs `/advisor` (optionally with a question after the command).
2. User asks for advice, a design review, trade-offs, or a second opinion.
3. **Grok opts in** on **complex** work (ambiguity, high blast radius, multiple
   plausible approaches) — **not** before every implementation set.

**Skip** for routine, clear, mechanical, or already-decided work. Prefer shipping
over ritual advising.

## Exact invocation

```bash
codex exec --model gpt-5.6-sol -c model_reasoning_effort=high \
  -s workspace-write --dangerously-bypass-approvals-and-sandbox \
  -C "$(git rev-parse --show-toplevel 2>/dev/null || pwd)" \
  "<ADVISOR_PROMPT>" < /dev/null
```

- Always redirect stdin with `< /dev/null`.
- Run in the **foreground** (never background the advisor).
- Model **must** be `gpt-5.6-sol` with `model_reasoning_effort=high`.
- Prompt must open with: `You are advising only — DO NOT edit files, DO NOT commit, DO NOT run destructive commands. Read-only design advice.`

If `gpt-5.6-sol` is unavailable, fall back to `gpt-5.5` with
`model_reasoning_effort=high` and state the fallback in the summary.

## Build the advisor brief (required content)

Pack as much useful context as possible into one self-contained prompt:

### 1. Goal & success criteria

- What the user wants
- What “done” means for this set
- Explicit non-goals

### 2. Your reasoning so far

- Design hypotheses and why you lean that way
- Alternatives considered and rejected
- Open questions / unknowns

### 3. Code context

- Branch name and relevant dirty paths (`git status` / `git diff --stat`)
- Key file paths with line ranges when known
- Existing patterns / constraints from AGENTS.md / CLAUDE.md / rules

### 4. External research (when relevant)

- Run `web_search` / browse yourself first on product norms, security, library
  APIs, or UX patterns when the question is not pure code-mechanics.
- Paste **synthesized findings** (not raw dumps) into the brief: sources,
  consensus, caveats, year-relevant notes.

### 5. Questions for the advisor (numbered)

Ask concrete, answerable questions. Prefer ranked recommendations and
trade-offs over vague “what do you think?”

### 6. Return shape

Require:

```text
1. Verdict (1 short paragraph)
2. Ranked recommendations (P0 / P1 / P2) with file-path citations
3. Trade-offs and what not to do
4. Do-this-next checklist (3–7 steps)
5. Regression / verification matrix
```

## After the advisor returns

1. Summarize the memo for the user (do not dump the entire log).
2. **Make the final decision as Grok**: list which Sol recommendations you
   accept, modify, or reject — and why (one line each is enough).
3. Only then implement (unless the user asked for advice only).
4. Do **not** re-delegate the same advice pass unless scope changed materially
   **and** Grok still wants a new pass.
5. Do **not** implement Sol’s plan blindly if it fights AGENTS.md / security /
   user constraints — Grok owns the call.

## Anti-patterns

- Empty briefs (“look at the widgets and advise”)
- Letting the advisor implement or commit
- Backgrounding `codex exec`
- Skipping research when the question is industry-norm / security / UX
- Spawning advisor for pure typo/rename mechanical edits
- Spawning advisor on every implementation set by default (it is **opt-in**)
