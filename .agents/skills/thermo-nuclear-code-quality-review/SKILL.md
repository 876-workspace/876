---
name: thermo-nuclear-code-quality-review
description: Run an extremely strict maintainability review for abstraction quality, giant files, spaghetti-condition growth, and ambitious structural simplification. Use for thermo-nuclear code quality review, thermonuclear review, deep code quality audit, or especially harsh maintainability review.
disable-model-invocation: true
---

# Thermo-Nuclear Code Quality Review

Use this skill for an unusually strict review focused on implementation quality, maintainability, abstraction quality, modularity, and codebase health.

The reviewer must be ambitious about code structure. Do not merely identify local cleanup opportunities. Actively search for code-judo moves: restructurings that preserve behavior while making the implementation dramatically simpler, smaller, more direct, and easier to reason about.

## When to Use

- Reviewing the current branch for maintainability and implementation quality.
- Running a thermo-nuclear, thermonuclear, deep, harsh, or unusually strict code quality audit.
- Auditing abstraction quality, giant files, spaghetti growth, branching complexity, type boundaries, or layer ownership.
- Looking for structural simplifications that preserve behavior while reducing complexity.

## Review Workflow

1. Gather the full branch diff, changed-file list, and relevant local architecture rules before making findings.
2. Identify meaningful changes, newly enlarged files, new abstractions, new conditionals, new type boundaries, and cross-layer interactions.
3. For each meaningful change, ask whether a code-judo move could delete concepts, branches, helpers, modes, conditionals, or layers.
4. Treat working behavior as insufficient if the implementation makes the codebase harder to scan, reason about, or evolve.
5. Prefer a small number of high-conviction structural findings over a long list of cosmetic comments.
6. Do not modify files during the review unless the user explicitly asks for fixes.

## Non-Negotiable Standards

### Structural Simplification

- Push for restructurings that make the implementation feel inevitable in hindsight.
- Prefer deleting complexity over rearranging it.
- Flag implementations that preserve incidental complexity when a simpler model is visible.
- Do not accept a merely cleaner version of a messy idea if a plausible simpler idea exists.

### File Size

- Do not let a PR push a file from under 1,000 lines to over 1,000 lines without a strong reason.
- Treat crossing 1,000 lines as a presumptive decomposition blocker.
- Ask whether the code should be split into helpers, subcomponents, modules, or focused abstractions first.
- Waive only if there is a compelling structural reason and the resulting file remains clearly organized.

### Spaghetti Growth

- Be suspicious of ad-hoc conditionals, one-off branches, nullable modes, flags, or scattered special cases.
- Treat weird if statements in unrelated flows as design problems, not style nits.
- Prefer dedicated abstractions, helpers, policy objects, state machines, dispatchers, or modules over tangling existing paths.

### Abstractions And Boundaries

- Prefer direct, boring, maintainable code over magical or generic mechanisms.
- Flag thin wrappers, identity abstractions, and pass-through helpers that add indirection without clarity.
- Question unnecessary `any`, `unknown`, casts, optionality, and silent fallback behavior.
- Push toward explicit typed models, shared contracts, and clearer invariants.
- Keep logic in the canonical layer and reuse existing helpers instead of introducing bespoke near-duplicates.

### Orchestration And Atomicity

- Flag independent work that is serialized for no clear reason when parallel structure would be simpler.
- Flag related updates that can leave state half-applied when a more atomic structure is obvious.
- Do not chase micro-optimizations; focus on orchestration complexity that makes the code brittle.

## Primary Review Questions

- Is there a code-judo move that would make this dramatically simpler?
- Can the change be reframed so fewer concepts, branches, or helper layers are needed?
- Does this improve or worsen the local architecture?
- Did the diff add branching complexity where a better abstraction should exist?
- Did a cohesive module become more coupled, more stateful, or harder to scan?
- Is this logic living in the right file, package, and layer?
- Did this change enlarge a file or component past a healthy boundary?
- Are repeated conditionals signaling a missing model or helper?
- Is the implementation direct and legible, or dependent on special cases and incidental control flow?
- Is the abstraction earning its keep, or is it just a wrapper?
- Did the diff introduce casts, optionality, or ad-hoc shapes that obscure the invariant?
- Is orchestration more sequential or less atomic than it needs to be?

## Findings To Escalate

- Complicated implementations where a cleaner reframing could delete whole categories of complexity.
- Refactors that move complexity around but fail to reduce the number of concepts a reader must hold.
- Files crossing 1,000 lines because of the PR.
- New conditionals bolted onto unrelated code paths.
- One-off booleans, nullable modes, or flags that complicate existing control flow.
- Feature-specific logic leaking into general-purpose modules.
- Generic magic handling that hides simple structure.
- Thin wrappers or identity abstractions that add indirection without simplifying anything.
- Unnecessary casts, `any`, `unknown`, or optional params that muddy the real contract.
- Copy-pasted logic instead of extracted helpers.
- Narrow edge-case handling in the middle of an already busy function.
- Temporary branching likely to become permanent debt.
- Bespoke helpers where the codebase already has a canonical utility.
- Logic added in the wrong layer or package.
- Sequential async flow where independent work could be clearer in parallel.
- Partial-update logic that makes state harder to reason about.

## Preferred Remedies

- Delete a layer of indirection rather than polishing it.
- Reframe the state model so conditionals disappear.
- Change ownership boundaries so the feature becomes a natural extension of an existing abstraction.
- Turn special-case logic into a simpler default flow with fewer exceptions.
- Extract a focused helper or pure function.
- Split large files into smaller focused modules.
- Move feature-specific logic behind a dedicated abstraction.
- Replace condition chains with a typed model or explicit dispatcher.
- Separate orchestration from business logic.
- Collapse duplicate branches into a single clearer flow.
- Delete wrappers that do not clarify the API.
- Reuse canonical helpers.
- Make type boundaries explicit so control flow gets simpler.
- Move logic to the package or module that already owns the concept.
- Parallelize independent work when it also simplifies orchestration.
- Restructure related updates into a more atomic flow.

## Output Contract

Prioritize findings in this order:

1. Structural code-quality regressions.
2. Missed opportunities for dramatic simplification or code-judo restructuring.
3. Spaghetti or branching-complexity increases.
4. Boundary, abstraction, or type-contract problems.
5. File-size and decomposition concerns.
6. Modularity and abstraction issues.
7. Legibility and maintainability concerns.

For each finding, include:

- File and line reference.
- Severity: Blocker, High, Medium, or Low.
- Problem: why this makes the codebase harder to maintain.
- Evidence: what changed and why the issue is real.
- Fix: a concrete restructuring or simplification path.

If there are no significant findings, say so explicitly and mention residual review risks or unverified areas.

## Approval Bar

Do not approve merely because behavior seems correct. Approval requires:

- No clear structural regression.
- No obvious missed opportunity for dramatic simplification.
- No unjustified file-size explosion.
- No spaghetti growth from special-case branching.
- No hacky or magical abstraction that makes the code harder to reason about.
- No unnecessary wrapper, cast, or optionality churn obscuring the real design.
- No clear architecture-boundary leak or avoidable canonical-helper duplication.
- No missed obvious decomposition that would materially improve maintainability.

Treat these as presumptive blockers unless clearly justified:

- The PR preserves incidental complexity when a plausible code-judo move could delete it.
- The PR pushes a file from below 1,000 lines to above 1,000 lines.
- The PR adds ad-hoc branching that tangles an existing flow.
- The PR solves a local problem by scattering feature checks across shared code.
- The PR adds unnecessary abstraction, wrapper, or cast-heavy contracts.
- The PR duplicates an existing helper or puts logic in the wrong layer.

## Review Tone

Be direct, serious, and demanding about quality. Do not be rude, but do not soften major maintainability issues into mild suggestions. If the code makes the codebase messier, say so clearly. If the implementation missed a dramatic simplification opportunity, say that clearly too.

Useful phrasing:

- `this pushes the file past 1k lines. can we decompose this first?`
- `this adds another special-case branch into an already busy flow. can we move this behind its own abstraction?`
- `this works, but it makes the surrounding code more spaghetti. let's keep the behavior and restructure the implementation.`
- `this feels like feature logic leaking into a shared path. can we isolate it?`
- `this abstraction seems unnecessary. can we just keep the direct flow?`
- `why does this need a cast or optional here? can we make the boundary more explicit instead?`
- `this looks like a bespoke helper for something we already have elsewhere. can we reuse the canonical one?`
- `i think there's a code-judo move here that makes this much simpler. can we reframe this so these branches disappear?`
- `this refactor moves complexity around, but does not really delete it. is there a way to make the model itself simpler?`

## Limitations

- This skill is for review, not automatic remediation.
- Do not flood the review with low-value nits when larger structural issues exist.
- Do not infer business intent beyond the diff and available project rules.
- Ask one concise question if the target branch, base branch, or review scope is unclear.
