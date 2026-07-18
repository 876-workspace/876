# Advisor Rule — optional gpt-5.6-sol for complex work

Mirrors `.grok/rules/advisor.md` and `.claude/rules/advisor.md`. Sol is an
**optional** second opinion — **not** mandatory before every implementation set.

## When the primary agent may call the advisor

The primary agent (Grok) **chooses** whether to spawn Sol. Call advisor only
when **both** are true:

1. **Complex** — design/architecture/product ambiguity or high blast radius.
2. **Primary decides it needs help** — unsure, wants a second pass, or user
   asked for `/advisor` / a second opinion.

Default: **reason and implement without Sol.** Do not ritual-advise routine work.

### Skip advisor

Mechanical renames/typos/format, explicit unambiguous user instructions, routine
fixes with a clear plan, follow-ups that only execute a decided approach.

When unsure: **default skip** unless complexity or user request warrants a memo.

## Authority (do not invert)

| Role                     | Owns                                                       |
| ------------------------ | ---------------------------------------------------------- |
| **Sol (advisor)**        | Options, risks, ranked P0/P1/P2 — **when invited**         |
| **Primary agent (Grok)** | **Whether to ask Sol**, **final decision**, implementation |

Sol’s memo is advice, not orders. Primary may reject and proceed.

## How to spawn (when opted in)

```bash
codex exec --model gpt-5.6-sol -c model_reasoning_effort=high \
  -s workspace-write --dangerously-bypass-approvals-and-sandbox \
  -C /workspaces/876 \
  "<ADVISOR_PROMPT>" < /dev/null
```

- Always `< /dev/null`. Foreground only. No advisor commits or file edits.
- Brief: goal, your reasoning, file paths, research when relevant, numbered
  questions, ranked-return shape (verdict, P0/P1/P2, next steps, regression).

## After advice (if used)

Primary **decides**, then **implements**. Sol is never final authority. Fall
back to `gpt-5.5` high if `gpt-5.6-sol` is unavailable; say so.

## Relationship to other routing rules

Complements `cli.md`. Optional complex-work tool, not a gate. Does not override
security or commit-attribution rules.
