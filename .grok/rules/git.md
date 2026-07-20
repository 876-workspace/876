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
- **Base Branch**: Always branch from and target `main`.
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
4. Squash commits if needed to keep history clean.
5. Ensure CI/CD passes before merging.
6. Delete branch after merging.
7. **Always auto-check the same PR for merge conflicts immediately after submitting it.** After creating (or updating) a PR, verify it is mergeable against the base branch — e.g. `gh pr view <number> --json mergeable,mergeStateStatus` (poll until GitHub finishes computing `mergeable`, since it is briefly `UNKNOWN`). If it reports `CONFLICTING`, surface the conflicting files and resolve them (merge the latest base branch in and fix conflicts) before considering the PR ready.

## Merge Strategies

- **Merge commit**: When preserving complete history is important.
- **Squash and merge**: When cleaning up messy commit history in PRs.
- **Rebase and merge**: When maintaining linear history.

## Git Workflow Reminders

**Before I commit:**

1. Run `git status` to identify **all** changes: modified, added, deleted, and **untracked** files.
2. **Run `pnpm format` and `pnpm lint`.** These commands must be run once before starting the commit process to ensure all changed files follow project standards. Re-run them if files are modified during the commit/fixing process.
3. Run test suite when appropriate for the change. Do not run `pnpm build` unless the user asks for a build, the change affects build behavior, or debugging requires it.
4. If the change introduces a new subsystem, workflow, public API, or durable operational behavior, add or update the matching project documentation in the same logical change set or in a clearly paired documentation commit.
5. **Group files into logical commits.** Stage and commit files one group at a time using `git add <path>` per group, then `git commit` with a message specific to those files. Use `git add -A` only when all current changes form a single coherent unit. Documentation/config rule changes must be separate commits from application code.
6. After each commit, run `git status` again to verify the commit landed and identify remaining unstaged files.
7. Review the staged diff with `git diff --cached` before each commit.
8. Write a meaningful commit message scoped to the files in that commit — never a generic catch-all covering unrelated changes.

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
