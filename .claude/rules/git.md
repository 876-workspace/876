# Git & Pull Request Guidelines

## Primary Responsibilities (AI Agent)

When monitoring the repository, actively assist with generating clear, conventional commit messages for all file changes.

**IMPORTANT: NEVER automatically commit changes. You must ALWAYS wait for an explicit prompt or approval from the user before executing any git commit command.**

**IMPORTANT: NEVER add Claude (or any AI agent) as a commit contributor.** Do not append `Co-Authored-By: Claude ...` trailers, `Generated with Claude Code` lines, or any similar AI attribution to commit messages, commit bodies, or PR descriptions. If such a trailer or line is detected on an existing local (unpushed) commit, remove it — amend the commit (or rebase) to strip the attribution before pushing. Author and co-author metadata must reflect human contributors only.

## Commit Messages

**CRITICAL: Every commit message MUST explain _what_ changed and _why_ in specific, meaningful detail. Generic messages are NEVER acceptable. If a message does not describe the actual change with enough specificity for a reader to understand the intent from the title alone, the change set is too broad — split it into smaller, focused commits.**

Follow **Conventional Commits** format: `<type>(<scope>): <description>`

### Types

- `feat`: New feature or functionality
- `fix`: Bug fix
- `docs`: Documentation changes only
- `style`: Code style/formatting (no functional changes)
- `refactor`: Code restructuring without changing functionality
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (dependencies, build, etc.)
- `revert`: Reverting previous commits
- `build`: Build system or external dependencies
- `ci`: CI/CD configuration changes

### Examples

- `feat(authentication): add OAuth2 login support`
- `fix(api): resolve null pointer exception in user service`
- `docs(readme): update installation instructions`

### Best Practices

1. **Atomic Commits**: One logical change per commit. Each file (or tightly coupled file group) must have its own commit with a message specific to that change — never write a single commit whose body lists changes across many unrelated files.
2. **Imperative Mood**: "add feature" not "added feature".
3. **Length Limit**: Limit first line to 50-72 characters.
4. **Detailed Body**: Add detailed body if needed (separated by blank line).
5. **Issue References**: `fix(auth): resolve login timeout (#123)`.
6. **Meaningful Messages**: Every commit message must explain **what** changed and **why** — not just list file names. Readers should understand the intent from the title alone.
   - Good: `feat(features): support per-org and per-user feature flag overrides`
   - Bad: `feat(core): update provider client` (too vague - what changed?)
   - Bad: `feat(auth): update guards` (what about guards?)
   - Bad: `chore: fix lint` (which lint? where?)
   - Bad: `fix: update` (update what and why?)
7. **Avoid Catch-All Messages**: Never write commits like `"various fixes"`, `"update files"`, `"wip"`, `"changes"`, `"cleanup"`, or `"fix stuff"`. If you can't write a specific 50-72 char title, the change set is too broad — split it.
8. **Security**: Warn if detecting API keys, passwords, or credentials.

### Commit Granularity

Stage and commit files individually or in small logical groups. Each commit message must describe **only** what that specific commit changes.

**Rules:**

- Never bundle unrelated files into one commit with a catch-all message. A commit that touches 8 files and lists 8 bullet points is almost always wrong — split it into 8 focused commits (or fewer if some files change in lockstep).
- Grouping is allowed **only** when files are tightly coupled (e.g., a route handler + its shared types + its service layer changed in a single coordinated step). Even then, the commit message must name the specific files and what changed in each.
- Documentation or config rule changes should be separate commits from application code changes.
- Example of correct granularity:
  - `feat(console-features): add per-org and per-user feature flag grant/revoke API` _(+client.ts, +schemas.py)_
  - `feat(console-features): add feature groups panel for bulk org/user assignment on console` _(2 new files)_
  - `refactor(api-models): move billing model imports to avoid circular dependencies` _(6 files)_
  - `chore(rules): add formatting rule and update git workflow` _(two rule files)_
- Example of **incorrect** granularity:
  - `feat(auth): add dashboard, proxy, session, auto-login, redirect, and rules` _(8 unrelated files, one generic message)_
  - `fix: update files` _(no scope, no description of what was fixed)_
  - `chore: cleanup` _(what was cleaned and why?)_

## File Change Analysis

Before committing, analyze each changed file:

1. **Identify the type of change** (feat, fix, refactor, etc.)
2. **Determine the scope** (component, module, or feature affected)
3. **Describe what changed** in clear, present tense
4. **Note file status**: modified, added, deleted, renamed, or untracked

## Branching

- **Naming**: `feature/short-description`, `fix/short-description`, `refactor/short-description`, `docs/description`.
- **Base Branch**: Branch from and target `main` — except for a phase of
  multi-phase work, which branches from and targets its feature
  integration branch instead (see "Feature Integration Branches" below).
- **Best Practices**:
  1.  When creating a new branch, always ask the user if it should be based on the current branch (whichever we're on) or `main`.
  2.  Create new branch from updated `main` (or chosen base).
  3.  Keep branches short-lived.
  4.  Regularly pull latest changes from base branch.
  5.  Delete merged branches.

## Pull Request Management

### PR Title Format

Follow same convention as commits: `<type>(<scope>): <description>`

### PR Description Template

```markdown
What does this PR do?
[Brief description of changes]

Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

Changes made

- [List key changes]
- [Be specific]

Testing

- [ ] Tests added/updated
- [ ] All tests passing
- [ ] Manual testing completed

Related Issues
Closes #[issue number]
```

### PR Best Practices

1. Keep PRs focused and reasonably sized (< 400 lines when possible).
2. Request reviews from relevant team members.
3. Respond to all review comments.
4. Squash commits if needed to keep history clean — but never when the PR
   targets a feature integration branch, whose whole purpose is to carry
   every commit through to the final `main` PR.
5. Ensure CI/CD passes before merging.
6. Delete branch after merging — unless another PR is stacked on it.
7. **Always auto-check the same PR for merge conflicts immediately after submitting it.** After creating (or updating) a PR, verify it is mergeable against the base branch — e.g. `gh pr view <number> --json mergeable,mergeStateStatus` (poll until GitHub finishes computing `mergeable`, since it is briefly `UNKNOWN`). If it reports `CONFLICTING`, surface the conflicting files and resolve them (merge the latest base branch in and fix conflicts) before considering the PR ready.

## Feature Integration Branches (multi-phase work)

Read this before starting any feature large enough to span more than two or
three pull requests. See `.claude/rules/phased-implementation.md` for how such a feature
is broken into phases, tracked in Linear, delegated, and verified — this section
covers only the git mechanics.

Small, self-contained changes branch from `main` and target `main`, exactly as
described above. **A multi-phase feature does not.** It gets its own long-lived
integration branch — an "alt main" — that collects every phase, and only that
branch opens a pull request against `main`.

```
main
 └── develop                        ← feature integration branch ("alt main")
      ├── feat/<feature>-schema     ← phase 1, PR → develop
      ├── feat/<feature>-enforce    ← phase 2, PR → develop
      ├── feat/<feature>-admin-api  ← phase 3, PR → develop
      └── docs/<feature>            ← docs, PR → develop
                                       then ONE PR: develop → main
```

### The rules

1. **Cut the integration branch from an up-to-date `main`** and push it before
   any phase work starts. Name it `develop` when it is the standing integration
   branch, or `feature/<name>` when the work is scoped to one feature and the
   branch retires with it.
2. **Every phase is its own branch and its own PR targeting the integration
   branch — never `main`.** Phases stay small enough to review on their own.
3. **Merge each phase into the integration branch as it goes green**, one by
   one, in dependency order. Do not wait and merge them all at the end; a phase
   that has been reviewed and passes should land so the next one builds on it.
4. **Do not open the `main` PR until the feature is actually complete.** The
   integration branch is where a half-finished feature is allowed to live.
   `main` only ever receives whole, working features.
5. **Merge with merge commits, never squash.** The point of the integration
   branch is that the final `main` PR carries every individual commit from
   every phase, so the history reads as the real sequence of work rather than
   one opaque blob.
6. **Do not delete a phase branch while another phase is stacked on it.**
   Deleting a parent branch closes or orphans its children.

### Stacked phases

When phase 2 genuinely depends on phase 1's code, branch it from phase 1 and
target its PR at phase 1's branch, not at the integration branch. The diff then
shows only phase 2's work. When phase 1 merges, retarget phase 2 onto the
integration branch:

```bash
gh api -X PATCH repos/<owner>/<repo>/pulls/<n> -f base=develop
```

(`gh pr edit --base` trips a Projects-classic GraphQL deprecation on this repo;
the REST call above is the working form.)

### The final `main` PR

One pull request, integration branch → `main`, whose description explains the
**whole feature** rather than the last phase: what it does, the design decisions
behind it, and how it was verified. Treat it as the document someone reads a
year later to understand why the feature is shaped the way it is.

Verify the integration branch itself before opening it — check out the merged
branch and run the full verification commands there. Green phase PRs do not
prove the merged result is green.

## Merge Strategies

### Merge commit subjects

GitHub's default merge subject — `Merge pull request #76 from owner/branch` —
says nothing about what changed. Every merge commit must read as a real commit
message.

Use the PR title with the PR number appended, and name the merged branch in the
body:

```bash
gh pr merge <n> --merge \
  --subject "feat(storage-api): reject an upload that would exceed a storage quota (#74)" \
  --body "Merges feat/storage-quota-enforcement."
```

The trailing `(#74)` keeps GitHub's auto-link to the pull request, so nothing is
lost by dropping the default wording. This applies to phase merges into an
integration branch and to the final merge into `main` alike — `git log
--first-parent main` should read as a list of features, not a list of branch
names.

- **Merge commit**: When preserving complete history is important.
- **Squash and merge**: When cleaning up messy commit history in PRs.
- **Rebase and merge**: When maintaining linear history.

## Git Workflow Reminders

**Before I commit:**

1. Run `git status` to identify **all** changes: modified, added, deleted, and **untracked** files.
2. **Always keep formatting changes.** Never discard, stash away, or leave uncommitted formatting-only diffs — including churn in generated files (e.g. a regenerated Prisma client). Commit them in their own `style(<scope>): ...` commit, separate from functional changes.
   - **If the formatting churn would blur a focused PR, give it its own branch and PR.** A separate commit is the default; a separate PR is required once the formatting diff touches files the PR is not otherwise about, or is large enough that a reviewer has to hunt for the real change. Consistency matters, but not at the cost of an unreviewable diff — the reviewer of a five-file bug fix should not be paging through a reformatted lockfile.
   - **Environment-induced churn is not a formatting change and must not be committed.** A `pnpm-lock.yaml` that a sandbox regenerated with different peer resolution (dropped optional/platform deps, collapsed `resolution:` blocks) is noise that can break CI on other platforms. Tell it apart from real formatting by running the repo's formatter over the file: if the diff collapses to near-zero, it was formatting and the formatted result is what to commit; if thousands of lines of dependency entries remain, revert it. Only commit a lockfile when dependencies genuinely changed.
3. **Run `pnpm format` and `pnpm lint`.** These commands must be run once before starting the commit process to ensure all changed files follow project standards. Re-run them if files are modified during the commit/fixing process.
4. Run test suite when appropriate for the change. Do not run `pnpm build` unless the user asks for a build, the change affects build behavior, or debugging requires it.
5. If the change introduces a new subsystem, workflow, public API, or durable operational behavior, add or update the matching project documentation in the same logical change set or in a clearly paired documentation commit.
6. **Group files into logical commits.** Stage and commit files one group at a time using `git add <path>` per group, then `git commit` with a message specific to those files. Use `git add -A` only when all current changes form a single coherent unit. Documentation/config rule changes must be separate commits from application code.
7. After each commit, run `git status` again to verify the commit landed and identify remaining unstaged files.
8. Review the staged diff with `git diff --cached` before each commit.
9. Write a meaningful commit message scoped to the files in that commit — never a generic catch-all covering unrelated changes.

**Before pushing:**

1. Ensure I'm on correct branch.
2. Pull latest changes first.
3. Resolve any merge conflicts.
4. Verify tests still pass.

**Before creating PR:**

1. Update branch with latest base branch.
2. Clean up commit history if needed.
3. Run `/code-review` to catch correctness bugs and quality issues before opening the PR. Use `/code-review ultra` for a deeper multi-agent cloud review.
4. Write comprehensive PR description.
5. Self-review the diff.
6. Assign appropriate reviewers.

## Common Git Commands

- `git status`: Show current state (always use first to see modified **and** untracked files)
- `git diff`: Review changes before staging
- `git add -A`: Stage all changes at once — use only when all changes form a single coherent unit; otherwise stage files individually per the Commit Granularity section
- `git add <path>`: Stage specific paths for a focused commit; prefer this for multi-file feature work where each file or tightly coupled group gets its own commit
- `git commit --amend`: Fix last commit
- `git stash`: Temporarily save work
- `git cherry-pick`: Apply specific commits
- `git reflog`: Recover lost commits

## Error Prevention

Warn me if:

- Large files being committed (> 50MB)
- Sensitive patterns detected (API keys, tokens, passwords)
- Committing dependencies that should be in `.gitignore`
- Force pushing to shared branches
- Commit message doesn't follow convention
- **A single commit covers many unrelated files with a generic catch-all message** — split into focused per-file or per-group commits
- **Untracked files are present in `git status` but were not staged before committing**
