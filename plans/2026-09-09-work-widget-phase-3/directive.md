# GPT Web Directive — Phase 3 Closeout

Pull the latest `feat/work-widget-phase-3` before continuing. The local review has
already rebased onto the error-action and calendar-range commits and added fixes
for contextual event fixtures and stale task pagination. Do not recreate or
overwrite those changes.

## Next source work

1. Add browser/component regression coverage proving successful Today data stays
   mounted when a later refresh fails. Exercise the banner retry path as part of
   the same test if the harness makes that practical.
2. Add focused orchestration coverage for the task-list pagination race: start a
   load-more request, switch lists before it resolves, then prove the stale page
   is not appended to the new list.
3. Add focused coverage proving month/week date selection reuses the already
   loaded calendar range while the explicit error action still retries the
   request.
4. Perform one final static pass over the complete `origin/main...HEAD` diff for
   permission leaks, non-canonical payloads, swallowed errors, duplicate helpers,
   and accidental growth of the view orchestrators. Fix only concrete findings.

## Closeout discipline

- Keep `@876/work-ui` controlled and transport-free; browser requests remain in
  the widget/host orchestration layer.
- Keep transformed host payloads validated by canonical `@876/work` schemas.
- Keep task-list and calendar-list lookups as non-fatal enrichment.
- Do not expose task deletion or invent a large/pop-out layout in this phase.
- Update `tracker.md` only for source work you actually complete. Do not claim
  local executable checks you did not run.
- Write the final report at
  `reports/gpt-web/2026-09-09-work-widget-phase-3.md`, including remaining risks
  and the exact commits reviewed.
- Do not open or merge a PR unless the user explicitly asks.

## Local review state

- Literal test delta against Phase 2 `main`: 67 added, 3 removed, net +64.
- `@876/work` typecheck and 220 tests pass.
- `@876/work-ui` typecheck passes.
- `@876/invoice-app` typecheck and 455 tests pass.
- `@876/widgets` typecheck and 149 unit tests pass.
- Browser-test, build, transpile, and service-bundle status is recorded in
  `tracker.md`; treat that file as authoritative after pulling.
