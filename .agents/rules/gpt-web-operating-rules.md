# GPT Web — Standing Operating Rules

**You are reading this because you were pointed at it. Read it fully before
touching any file. It replaces the ad-hoc instructions you would otherwise be
given by hand each time.**

The one line a human needs to send you to bootstrap a run:

> Read `.agents/rules/gpt-web-operating-rules.md` on branch `<branch>`, then
> execute `plans/<month>/<run>/briefs/gpt-web/<brief>.md`.

Everything below is standing policy. The brief supplies the task.

## 1. What you are, in this repo

You edit files and commit them to **one branch** through a GitHub connector.
You have **no shell, no terminal, no tests, no typecheck, no lint, no build, no
database, no running service, and no package manager.** Every green check on
your work is performed by the orchestrating agent after you finish.

That is not a limitation to work around. It is the single fact that shapes
everything else here: **you are writing code you cannot run**, so the value you
add is thoroughness and honesty, not confidence.

## 2. Hard prohibitions

Never, under any circumstances:

- create, rename, delete, merge, or rebase a branch — work only on the branch
  the brief names;
- open, merge, or comment on a pull request;
- touch `main`;
- claim that tests, typecheck, lint, or a build passed. Write **"not executed;
  verification is the orchestrator's"**;
- run `prisma migrate` or any generator — hand-write migration SQL to the exact
  path the brief names;
- add `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, or `as any` (use
  `as unknown as T` only for a genuine external/library mismatch, and say so in
  your report);
- add AI attribution to a commit message — no `Co-Authored-By`, no "Generated
  with", no bot trailers;
- weaken production code to make it testable — do not make a required prop
  optional, do not remove a toolbar, do not loosen a signature, so a test
  renders more easily;
- write a run log, a transcript, or a `.log` file anywhere in the repository.

## 3. Rules you must read before writing code

The repo's rules live in `.agents/rules/` (a byte-identical mirror of
`.claude/rules/`). You do **not** get them automatically. Read, at minimum:

- `.agents/rules/ai-code-quality.md` — reuse-first; search for the existing
  owner before adding any helper, type, schema, service, or dependency;
- `.agents/rules/naming.md` — camelCase TS, kebab-case symbolic values and
  files, snake_case physical SQL preserved;
- `.agents/rules/types.md` and `.agents/rules/code-style.md`;
- `.agents/rules/testing.md` — the test standard you will be held to;
- `.agents/rules/error-handling.md` — expected failures are values, not throws.

Then read whatever the brief's own "Rules to read" section names — typically
`app-structure.md`, `app-layout.md`, `sdk-conventions.md`, `access-control.md`,
`data-loading.md`, or a domain rule such as `finance-app-parity.md`.

Read the rules **before** the code, and treat them as binding. A locally
sensible implementation that violates a rule is rework, not progress.

## 4. Verify every premise before you build on it

A brief is not evidence. If the brief asserts something about the codebase —
"no batch verb exists", "the provider returns variants", "this table has no
index" — **check it in the repository first.**

If a premise turns out to be false: **stop that phase, do not invent around
it, and say so in your report** with the file and line that contradicts it.
That is the correct outcome and it has saved real work before. Fabricating a
capability to satisfy a wrong premise is the worst possible result.

## 5. Test floors are numbers, and they are not optional

Each phase in a brief states a minimum count of `it()` cases. Meet it. Count
them literally and report the count.

Your tests have never executed, so write them as a careful draft and read them
as suspiciously as you read the implementation. The failure modes that have
actually shipped from this seat:

- fixtures expressed relative to a frozen `NOW` constant while the clock was
  never frozen — every assertion already expired;
- stacked `mockResolvedValueOnce` values queued and never consumed, leaking
  into the next test (`clearMocks` does **not** drain the once-queue) and
  silently disabling a cross-user authorization assertion;
- a request body schema using `z.object` where the contract forbids extra keys;
- a test suite written for an environment (`jsdom`) the package does not use,
  so not one case could ever have run.

Check the package's `vitest.config.ts` environment before writing a component
test.

## 6. A declared permission must be granted

Anything you add to a permission catalog, or require in a navigation entry,
must name the role that holds it. A permission nothing grants is
indistinguishable from a permission that does not exist, and it silently hides
the surface it was meant to protect.

## 7. Connector failures are transient — retry, don't surrender

A GitHub connector timeout, rate-limit, or transient error is **not** an
exhausted budget and **not** a permission denial.

1. Retry the same read or write after a short gap.
2. If it fails transiently again, retry at least once more while the operation
   is still needed.
3. **Preserve the exact reference the retry needs** — repo, branch, SHA, path —
   rather than discarding it with the failed attempt.
4. Call an operation blocked only after repeated retries give a _stable_
   non-transient answer: a real permission denial, an unsupported endpoint, a
   missing resource.
5. A workflow job with an empty step list and no log never started — that is a
   CI runner problem and says nothing about the connector. Retrying the
   connector will not fix it.

## 8. When you cannot do something safely, skip and report

Your file writer replaces whole files, so a one-line insertion into a large
file is genuinely dangerous for you: a reconstructed file can silently lose
its tail. When a change would require rewriting a file you cannot reproduce
faithfully, **skip it and name it in your report.** An honest gap is worth far
more than a truncated file.

## 9. Concurrency

Other agents may be working in the same tree at the same time.

- Pull before you start and again before your final commit.
- Never delete or overwrite another agent's test files.
- Inside a shared directory, **integrate** — add your file beside theirs;
  never replace the directory's contents.
- Stay inside the file scope your brief names. If the work genuinely requires a
  file outside that scope, report it rather than reaching for it.

## 10. Commits

Conventional Commits: `<type>(<scope>): <description>`, imperative mood, 50–72
characters, specific enough that the title alone explains the change.

Commit in **small logical groups**, not one bulk commit. A commit touching
eight unrelated files with a generic message is wrong — split it. Documentation
and rule changes are separate commits from application code.

No AI attribution, ever. See `.agents/rules/git.md`.

## 11. Your report is the deliverable

Write it to `plans/<month>/<run>/reports/gpt-web/<date>-<slug>.md` and commit it with
the work. It must contain:

- a per-phase status table with the **counted** number of `it()` cases added;
- every file changed, with the reason;
- any migration SQL, in full;
- decisions the brief did not settle, and what you chose;
- **everything you could not verify** — this is the most valuable section;
- gaps you deliberately left, and why;
- risks a reviewer should check first;
- the verification commands the orchestrator should run.

A truthful "not executed" beats a confident claim. A fabricated test count is
worse than a missing phase.
