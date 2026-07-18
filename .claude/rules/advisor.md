# Advisor Rule — optional gpt-5.6-sol for complex work

This path mirrors `.grok/rules/advisor.md`. Sol is an **optional** second
opinion. It is **not** mandatory before every implementation set.

## When the primary agent may call the advisor

The primary agent (Grok) **chooses** whether to spawn Sol. Call advisor only
when **both** are true:

1. **Complex** — real design/architecture/product ambiguity or high blast radius
   (cross-cutting multi-file work, security-sensitive paths, several plausible
   approaches with different trade-offs, UX redesigns that need a critique).
2. **Primary agent decides it needs help** — unsure, wants a ranked second pass,
   or the user asked for `/advisor` / a second opinion.

**Do not** call advisor for routine, clear, or well-scoped work just to satisfy
a process gate. Default is: **reason and implement without Sol.**

### Complex enough (examples)

- Cross-cutting feature with product + layout + lifecycle trade-offs
- Architecture choice with more than one reasonable approach
- Security/auth/session design where a second high-reasoning pass is useful
- Large UX redesign of a surface with competing patterns

### Skip advisor (examples)

- Mechanical renames, typos, formatting, lockfile noise
- Explicit user instructions with no design ambiguity
- Routine fixes/features with a clear plan already
- Follow-ups that only execute a decision already made

When unsure: **default skip** unless complexity or user request clearly warrants
a memo. Prefer shipping over ritual advising.

## Authority (do not invert)

| Role                     | Owns                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------- |
| **Sol (advisor)**        | Design options, risks, ranked P0/P1/P2, research-backed critique — **when invited** |
| **Primary agent (Grok)** | **Whether to ask Sol**, **final decision**, plan to ship, implementation            |

- Sol’s memo is advice, not orders. Accept / adapt / reject with a short
  rationale when you used it.
- Primary agent may disagree with Sol and proceed under user intent and repo rules.
- User `/advisor` or “get Sol’s take” **is** a request to invite Sol; primary
  agent still decides after the memo.

## How to spawn (when opted in)

```bash
codex exec --model gpt-5.6-sol -c model_reasoning_effort=high \
  -s workspace-write --dangerously-bypass-approvals-and-sandbox \
  -C /workspaces/876 \
  "<ADVISOR_PROMPT>" < /dev/null
```

Prompt must start with: advise only — no edits, no commits, no destructive
commands. Run **foreground only**. Prefer the `advisor` skill for the full brief
template.

Minimum brief quality bar when you do call Sol:

| Section                                                | Required |
| ------------------------------------------------------ | -------- |
| User goal + done criteria                              | Yes      |
| Your reasoning / alternatives                          | Yes      |
| File paths + current behavior                          | Yes      |
| Web/research synthesis when non-mechanical             | Yes      |
| Numbered questions                                     | Yes      |
| Requested return shape (verdict, P0/P1/P2, next steps) | Yes      |

Pass everything useful: conversation decisions, branch, dirty files, failed
tests, prior memos, rule excerpts, search findings.

## After advice (if used)

- Primary agent **decides**, then **implements** (or asks the user when the
  choice is truly product-owned and ambiguous).
- Do not treat Sol as the implementer or as the final authority.
- Never background the advisor. Never let it commit.
- If `gpt-5.6-sol` is unavailable, fall back to `gpt-5.5` high and say so.
- Re-advise only if scope changed enough that the previous memo is stale **and**
  a new pass is still wanted.

## Relationship to other routing rules

- Complements `cli.md` (task-class routing). Advisor is an **optional**
  complex-work tool, not a gate before every non-trivial change.
- Does **not** override security / “no AI commit attribution” / Fable-for-
  security-sensitive-code constraints when those apply to the primary agent.

## Triggers

| Trigger                              | Behavior                                                    |
| ------------------------------------ | ----------------------------------------------------------- |
| `/advisor …` or user asks for Sol    | Invite Sol (advice only unless user also asks to implement) |
| Complex work **and** primary opts in | Optional advise → decide → implement                        |
| Routine / clear work                 | Skip advisor; implement                                     |
| Pure mechanical edit                 | Skip advisor                                                |
