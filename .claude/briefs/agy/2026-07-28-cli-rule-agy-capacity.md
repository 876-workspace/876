# Update the CLI routing rule with Antigravity capacity and models

## Your goal

Edit **two** existing Markdown rule files so they record what Antigravity (`agy`)
actually is: an effectively unlimited-capacity CLI with its own model list, and a
correct non-interactive invocation.

The two files are near-identical mirrors of each other. **Both must end up with the
same content changes**, except that any relative rule links inside each file keep
that file's own prefix (see "Mirror rule" at the end).

| File to edit                | Prefix used by its internal links |
| --------------------------- | --------------------------------- |
| `.claude/rules/cli.md`      | `.claude/rules/`                  |
| `.agents/rules/cli.md`      | `.agents/rules/`                  |

**Never create or edit `.grok/rules/cli.md`.** That file must not exist. Do not
create it.

## Change 1 — the tooling inventory table row

Find the table row in the "Available tooling — verified, do not re-probe" section
whose first cell is `**agy** (Antigravity)`. It currently reads roughly:

```
| **agy** (Antigravity)   | `agy`                                      | ready                 | Docs-only tier, Sonnet 4.6 Thinking.  |
```

Replace **only the last cell** (the Notes cell) of that row with this text, keeping
the row's other three cells and the table's pipe structure intact:

```
**Effectively unlimited usage** — its plan has no practical cap, so prefer it for any high-volume non-critical work. Capable but literal: it needs step-by-step instructions with a worked example, and its output must always be reviewed. Models via `agy models`.
```

## Change 2 — replace the whole `## \`agy\` (Antigravity) — docs, unchanged` section

Find the section that currently starts with the heading:

```
## `agy` (Antigravity) — docs, unchanged
```

Delete that heading and its body paragraph entirely, and put this in its place:

````markdown
## `agy` (Antigravity) — unlimited-capacity tier for non-critical work

**Antigravity usage is effectively unlimited** under its current plan, so it is the
default tool for any high-volume work that does not need to be correct on the first
try: documentation, Markdown, placeholder scaffolding, mechanical file generation,
and bulk repetitive edits.

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
agy --model=<model> --effort=<low|medium|high> --dangerously-skip-permissions \
  --print "<task prompt>"
```

**Flag order matters.** `--print` (alias `-p` / `--prompt`) takes the prompt as its
value, so it must come **last**, immediately before the prompt string. Writing
`agy --print --model=X "<prompt>"` makes `agy` treat the model name as the prompt
and silently answer the wrong question — it exits 0 and writes nothing.

Note the `=` in `--model=` and `--effort=`; use that form.

### Models

Run `agy models` for the live list. As of July 2026 it offers:

| Model                                                            | Use for                                                         |
| ---------------------------------------------------------------- | --------------------------------------------------------------- |
| `gemini-3.1-pro-high`                                            | The default for delegated work — docs, scaffolding, bulk edits. |
| `gemini-3.6-flash-high` / `-medium` / `-low`                     | Trivial mechanical passes where speed matters more than care.   |
| `gemini-3.5-flash-high` / `-medium` / `-low`                     | Older flash tier; prefer 3.6.                                   |
| `gemini-3.1-pro-low`                                             | Cheap pro-tier pass.                                            |
| `claude-sonnet-4-6`, `claude-opus-4-6-thinking`, `gpt-oss-120b-medium` | Available, but route Claude-model work through the `Agent` tool instead. |

`agy` does not commit. The orchestrating agent stages and commits its output.
````

## Mirror rule

After editing, the two files must be identical **except** for relative rule links.
If a line you added or changed contains a path like `` `.claude/rules/something.md` ``,
then in `.agents/rules/cli.md` that same path must read `` `.agents/rules/something.md` ``.

The replacement text above contains no such links, so in practice both files receive
byte-identical replacement text. Do not "helpfully" rewrite any other links that
already exist in either file.

## Files you must NOT touch

- `.grok/rules/cli.md` — must not exist; do not create it.
- Any other file in `.claude/rules/`, `.agents/rules/`, or `.grok/rules/`.
- Any file under `apps/`, `packages/`, or `docs/`.
- `CLAUDE.md`.

## Verify before reporting done

```
npx prettier --check .claude/rules/cli.md .agents/rules/cli.md
test ! -e .grok/rules/cli.md && echo "grok cli.md correctly absent"
diff <(sed 's|\.agents/rules/|RULES/|g' .agents/rules/cli.md) <(sed 's|\.claude/rules/|RULES/|g' .claude/rules/cli.md) && echo "mirrors match"
```

If prettier reports formatting issues, run
`npx prettier --write .claude/rules/cli.md .agents/rules/cli.md`.

The `diff` must print nothing before `mirrors match`. If it prints differences, the
two files have drifted — fix them so they match.

## Absolute rules

- Do NOT run `git commit`, `git add`, `git checkout`, or `git push`.
- Do NOT reformat or restructure parts of the files you were not asked to change.
- Do NOT delete any other section.
