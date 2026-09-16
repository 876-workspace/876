# Report: document the Cline CLI in the CLI routing rule

Date: 2026-09-13
Scope: `.claude/rules/cli.md` and `.agents/rules/cli.md` (edited to be byte-identical)

## What changed

Three edits were applied identically to both `.claude/rules/cli.md` and
`.agents/rules/cli.md`:

1. **Available-tooling table** — added a `**Cline CLI**` row after the `Command Code`
   row documenting the command
   `cline -c <dir> -m <model> --thinking none -t <secs> "<prompt>" < /dev/null`,
   auth state `ready (v3.0.61)`, and notes that it targets free models on the
   trivial/mechanical tier and easy renames, always runs at `--thinking none`
   (except Muse), and is non-interactive by default.

2. **Routing table** — updated two rows:
   - **Trivial / mechanical / mass-simple edits**: model/tool cell now reads
     `**Cline** (free models, max speed) — or opencode / Command Code with DeepSeek V4 — orchestrate in parallel for independent file sets`.
   - **Docs-only work**: added `**Cline** (free models)` as the first option
     (before `agy`, Sonnet 4.6 Thinking and `opencode`/Command Code with DeepSeek V4).

3. **New section** `## Cline CLI — free models, trivial work, easy renames, docs`
   inserted immediately before the `## `opencode` — trivial/mechanical work and docs,
   DeepSeek V4` heading. It documents the headless invocation, the always-use
   `--thinking none` rule (Muse needs `--thinking low`), the `-c`/`-t`/`< /dev/null`
   flags, the harmless `session.hook` hook-dispatch error noise, the TTY-only
   subcommands, a "Free models (verified 2026-09-13)" table of six models, and the
   live-roster tip that promotions rotate.

After the edits, `npx prettier --write` was run on both files (to re-align the
new/updated Markdown table columns), and byte-identity was re-confirmed.

## Verify

Command 1 — `cmp`:
```
$ cmp .claude/rules/cli.md .agents/rules/cli.md && echo identical
identical
```

Command 2 — prettier check (after running `npx prettier --write` on both files):
```
$ npx prettier --check .claude/rules/cli.md .agents/rules/cli.md
Checking formatting...
All matched files use Prettier code style!
```

Both files are byte-identical and pass the prettier format check.