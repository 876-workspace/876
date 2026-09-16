# Refresh the `agy` model and quota facts in the CLI routing rule

Documentation-only task. **Do not change any code, test, or configuration file.**

## What is wrong

`.claude/rules/cli.md` records an `agy` model table and a quota table that were
measured on 2026-08-07 and are now stale. Verified today, 2026-09-06:

`agy models` currently returns exactly these 14 rows, in this order:

```
gemini-3.8-flash-high      Gemini 3.8 Flash (High)
gemini-3.8-flash-medium    Gemini 3.8 Flash (Medium)
gemini-3.8-flash-low       Gemini 3.8 Flash (Low)
gemini-3.7-flash-high      Gemini 3.7 Flash (High)
gemini-3.7-flash-medium    Gemini 3.7 Flash (Medium)
gemini-3.7-flash-low       Gemini 3.7 Flash (Low)
gemini-3.6-flash-high      Gemini 3.6 Flash (High)
gemini-3.6-flash-medium    Gemini 3.6 Flash (Medium)
gemini-3.6-flash-low       Gemini 3.6 Flash (Low)
gemini-3.1-pro-high        Gemini 3.1 Pro (High)
gemini-3.1-pro-low         Gemini 3.1 Pro (Low)
claude-sonnet-4-6          Claude Sonnet 4.6 (Thinking)
claude-opus-4-6-thinking   Claude Opus 4.6 (Thinking)
gpt-oss-120b-medium        GPT-OSS 120B (Medium)
```

`agy --output-format json --print-timeout 60s -p "/quota"` returned today:

| Bucket                    | Weekly | 5-hour       |
| ------------------------- | ------ | ------------ |
| Gemini models             | 66%    | 100%         |
| Claude and GPT models     | 0%     | disabled     |

## The changes to make

Edit **`.claude/rules/cli.md`** only, in the `agy` section:

1. **Replace the Models table** so it lists the models that actually exist
   today. `gemini-3.8-flash-high` is now the newest flash tier and the table
   does not mention the 3.7 or 3.8 families at all. Keep the table's existing
   two-column shape (`Model` / `Use for`) and its existing editorial voice —
   collapse the three effort variants of one family into one row the way the
   current table already does for 3.6.
2. **Update the "measured 2026-08-07" quota table** to the figures above, and
   change its date to 2026-09-06. Keep the surrounding prose that explains *why*
   the check matters — the point of that passage is that an exhausted bucket
   fails quietly, and that lesson is unchanged.
3. **Keep every existing warning intact**: the `--print-timeout` default of five
   minutes, the flag-order trap where `--print` must come last, the
   `stream-json` recommendation, the `--effort` rejection on Claude models, and
   the rule that Claude/GPT work should go through the `Agent` tool instead.
   These are still true. Do not shorten or reword them.
4. Note that `gemini-3.1-pro-medium` **does not exist** — only `-high` and
   `-low` — if the current text implies otherwise.

Then **mirror the result byte-for-byte** into `.agents/rules/cli.md`. The root
`CLAUDE.md` requires those two trees to hold identical files. Verify with:

```bash
diff .claude/rules/cli.md .agents/rules/cli.md && echo IDENTICAL
```

That command must print `IDENTICAL`.

## Constraints

- Markdown only. Do not touch `.ts`, `.tsx`, `.json`, `package.json`, or any
  file outside the two `cli.md` copies.
- Do not reflow, reformat, or reorder any section you were not asked to change.
  A diff that touches unrelated lines will be reverted.
- Do not commit. The orchestrator stages and commits.
- Do not write a run log or transcript anywhere.
- Do not invent a model, a limit, or a date that is not in this brief.

## Report

Print a short summary to stdout: which sections you changed, and the output of
the `diff` command above.
