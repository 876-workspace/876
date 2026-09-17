# 876 Projects Mobile — Start Here

This directory is the durable control center for the Projects Mobile implementation.

## Required read order for the local Muse/Codex driver

Read these files in this order before doing any implementation work:

1. `../../../../CLAUDE.md`
2. `../../../../.agents/rules/cli.md`
3. `../../../../.agents/rules/implementation-tracker.md`
4. `00-local-environment-preflight.md`
5. `01-react-native-expo-docs-and-ai-guardrails.md`
6. `02-single-branch-execution.md`
7. `plan.md`
8. `orchestrator-plan.md`
9. `local-muse-codex-plan.md`
10. Every additional rule named by `local-muse-codex-plan.md` for the phase being executed.

The environment preflight is intentionally first among the run-specific documents. It tells the local driver what must already exist on the Hetzner host, what to verify, what to install only if missing, and what **not** to install.

The React Native / Expo guardrail file is **binding for every mobile implementation phase**. Muse must re-check current official Expo, React Native, and relevant library documentation at execution time rather than relying on model memory or even the versions recorded in these planning files. Every native/mobile phase report must record the current docs consulted and the selected SDK/package versions.

`02-single-branch-execution.md` is also binding. It overrides any older multi-branch examples in the planning files. **All work for this run stays on `feature/projects-mobile`.** Muse/Codex must not create phase, scratch, temporary, or child branches unless the user explicitly changes that instruction later.

If Muse cannot verify the relevant current official documentation, it must stop that implementation step and report the gap instead of inventing an API or copying a remembered pattern.

## Current state

- Working branch: `feature/projects-mobile`
- Implementation: **started — orchestrator security/API/SDK foundation in progress**
- Branch policy: **single branch only**
- Local Muse implementation: should pull the current branch before continuing and read the latest reports/plan updates first.

The orchestrator is handling security/design-critical prerequisites first: native OAuth redirect correctness, bearer/session authority, Projects API session enforcement, and `@876/projects/session` transport. Expo screens and application feature UI remain for the local Muse/Codex driver after those contracts are stable.

## Local driver

The intended local implementation driver is Muse Spark 1.3 Contributor through Codex profile `muse`.

The repository's canonical invocation and delegation rules remain in `.agents/rules/cli.md`. Do not replace those rules with this README.
