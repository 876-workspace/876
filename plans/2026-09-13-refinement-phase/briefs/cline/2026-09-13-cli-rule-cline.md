# Brief (Cline): document the Cline CLI in the CLI routing rule

Working directory: `/root/projects/876` (main checkout; no worktrees). Other agents are editing app code in this tree right now: touch ONLY the two files below, never run git commands that change the tree (checkout/stash/reset/clean), do not commit.

## Files
1. `.claude/rules/cli.md`
2. `.agents/rules/cli.md` — must end **byte-identical** to file 1 (`cmp` must print nothing).

## Edits
A. In the "Available tooling — verified, do not re-probe" table, add a row after the `Command Code` row:

| **Cline CLI** | `cline -c <dir> -m <model> --thinking none -t <secs> "<prompt>" < /dev/null` | ready (v3.0.61) | Free models, trivial/mechanical tier and easy renames. **Always the fastest setting: `--thinking none`** except Muse (see below). Non-interactive by default (act mode, auto-approve on). |

B. In the "Routing table", change the "Trivial / mechanical / mass-simple edits" row's model/tool cell to: `**Cline** (free models, max speed) — or opencode / Command Code with DeepSeek V4 — orchestrate in parallel for independent file sets`. Change the "Docs-only work" row's cell to add `**Cline** (free models)` as the first option.

C. Add a new section immediately before the `## \`opencode\` — trivial/mechanical work and docs, DeepSeek V4` heading, with exactly this content:

````markdown
## Cline CLI — free models, trivial work, easy renames, docs

Cline (`cline`, v3.0.61) runs headless by default: a positional prompt starts
act mode with tool auto-approval on. Use it for mechanical renames, bulk
find-replace, scaffolding, and docs. Its output is reviewed like any delegate's.

```bash
cline -c /root/projects/876 -m deepseek/deepseek-v4-flash --thinking none \
  -t 3000 "$(cat plans/<run>/briefs/cline/<brief>.md)" < /dev/null > /dev/null 2>&1
```

- **Always run at maximum speed: `--thinking none`.** The one exception is Muse,
  whose endpoint rejects disabled reasoning — pass `--thinking low` for it.
- `-c <dir>` sets the working directory; `-t <seconds>` is a hard timeout
  (default is none — always set one); `< /dev/null` so it never waits on stdin.
- Harmless noise on every run: `error: hook dispatch failed: session.hook requires
  a valid hook event payload`. It does not affect the task.
- `cline config` and other subcommands need a TTY and fail headless.

### Free models (verified 2026-09-13)

Every model below answered a headless prompt on 2026-09-13:

| Model id                                | Notes                                   |
| --------------------------------------- | --------------------------------------- |
| `deepseek/deepseek-v4-flash`            | Default: fastest, 1M context            |
| `z-ai/glm-5.3-flash`                    | Fast multimodal                         |
| `cline-free/solar-pro4`                 | Documents and coding                    |
| `cline-free/longcat-2.0`                | Agentic coding                          |
| `poolside/laguna-s-2.1:free`            | Coding agent                            |
| `cline-free/muse-spark-1.3-contributor` | Needs `--thinking low` (reasoning mandatory) |

The free roster rotates. Promotions end without notice — `cline-free/deepseek-v4-flash`
and `cline-free/glm-5` from the Cline changelog both answer `Free model promotion
ended`. Read the live list rather than trusting this table:

```bash
cd "$(npm root -g)/cline" && node --input-type=module -e \
  "import('@cline/core').then(async m => console.log((await m.fetchClineRecommendedModels()).free.map(x => x.id)))"
```

Same rules as every delegate: explicit file scope, the verification commands,
no commits, no run logs, and judge the result by `git diff` and your own checks.
````

## Verify
```
cmp .claude/rules/cli.md .agents/rules/cli.md && echo identical
npx prettier --check .claude/rules/cli.md .agents/rules/cli.md
```
If prettier reports a difference, run `npx prettier --write` on both files and re-run `cmp`.

## Report
Write `plans/2026-09-13-refinement-phase/reports/cline/2026-09-13-cli-rule-cline.md`: what changed, and the output of both verify commands.
