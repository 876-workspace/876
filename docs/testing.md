# Testing

The repository uses a layered test strategy. Keep most behavior in fast,
isolated tests and reserve real browsers for interactions or rendering that a
DOM emulator cannot reproduce faithfully.

## Test layers

- **Functional tests** use Vitest for pure functions, service boundaries, and
  route handlers. Widget catalog tests live in `@876/widgets`. Widgets API
  service validation tests live in `@876/widgets-api`.
- **Component tests** use React Testing Library and `user-event`. Assert what a
  person can see or do through roles, labels, and visible text. Mock network,
  router, and database boundaries rather than component internals.
- **Browser component tests** use Vitest Browser Mode for browser-only widgets.
  The Notepad Editor.js test runs in Chromium because contenteditable behavior
  cannot be represented reliably by jsdom.
- **Application UI tests** use Playwright for a small set of public routing,
  accessibility, and visual smoke journeys across Console, Billing, and
  Couriers. These tests stay hermetic and do not require a deployed API or
  database.

Test names should describe the scenario and expected product behavior. Arrange
state, perform the user action, and then assert the observable outcome. Prefer
auto-waiting assertions over timers or sleeps, and add visual snapshots only to
stable, high-value states.

## Commands

```bash
pnpm test                         # all functional and jsdom component tests
pnpm test:browser                 # Notepad browser component tests
pnpm test:ui                      # all Playwright app/browser combinations
pnpm test:ui:update               # deliberately update visual baselines

pnpm test:ui --project=console-chromium
pnpm test:ui --project=billing-chromium
pnpm test:ui --project=couriers-chromium
```
