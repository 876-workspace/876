# Implementation Plan: Projects iOS-style mobile views

Run ID: 2026-09-15-projects-ios-mobile · Branch: main (uncommitted) · Status: IN_PROGRESS

## Overview
Make the Projects app feel like a native iPhone app below `sm`, desktop unchanged.

## Decisions
- Bottom tab bar (4 primary + More sheet from bottom) replaces the hamburger; avatar stays top-right.
- Mobile lists are iOS inset grouped lists, CSS-switched from the desktop table.
- Board on phones is a list sectioned by status (replaced muse's snap strip at user request: no cards).
- Phone lists are full-bleed chat-style rows, not cards.

## Briefs
| Delegate | Brief |
| --- | --- |
| codex (muse) | [ios-mobile-main-pages](./briefs/codex/2026-09-15-ios-mobile-main-pages.md) |

## Reports
| Delegate | Report |
| --- | --- |
| codex (muse) | [ios-mobile-main-pages](./reports/codex/2026-09-15-ios-mobile-main-pages.md) |

## Checklist
- [x] Shell: tab bar, More bottom sheet, safe-area viewport (orchestrator)
- [x] Projects list mobile grouped list (orchestrator)
- [x] Issues, Board, Labels mobile lists (muse), dashboard skipped by muse
- [x] New Home page, Dashboard renamed to Home (orchestrator)
- [x] Top bar hidden on phones; search + avatar in More sheet; floating glass tab bar
- [x] Chat-app style: shared `@876/projects-ui/mobile-list` (full-bleed rows, coloured avatars, inset separators, no cards) on Home, Projects, Issues, Labels, Board
- [x] Verification: projects-ui 133 tests, apps/projects 243 tests, tsc, app-structure, rsc-boundaries
- [ ] Mobile restyle of shared toolbar / shadcn controls (awaiting decision: @876/ui restyle vs Konsta UI)

## Verification
See brief.
