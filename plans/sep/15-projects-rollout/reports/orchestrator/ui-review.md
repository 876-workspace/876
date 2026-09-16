# UI review — Projects rollout

**Status:** static review done; an authenticated browser walkthrough is **still owed**.

## Why there's no browser walkthrough yet
The Projects app's session holds a real access token from core auth (`apps/projects/src/lib/auth/session.ts` forwards `session.accessToken`). A locally forged cookie can't carry one, and the orchestrator has no credentials for a test account. Walking the screens needs either a test login or a signed-in browser session. Until then, UI claims rest on jsdom tests and this static review.

## Static review against `app-layout.md` and the CLAUDE.md UI Copy rule
| Check | Result | Fix |
| --- | --- | --- |
| `ResourceToolbar` `description` subheadings | 1 (Gantt) | removed |
| Page `<h1>` not using `876-page-title` | 10 (portal pages, wiki page, discussion detail) | switched to `876-page-title` |
| Explanatory paragraphs under page headings | 11 in the app, 1 in Console | 10 removed; 2 cut to one-line non-obvious hints (secret shown once; 5 MB import limit) |
| Green buttons | 0 | — |
| Add buttons not labelled `Add` | 0 | — |
| Multi-field create/edit forms in dialogs | 0 (only delete confirmations) | — |
| Functions passed server → client | 0 (`check:rsc-boundaries`) | — |

## What to look at first when a signed-in session is available
Gantt drag/zoom and critical-path marking; the layout editor and forms rendered from layouts; blueprint and automation rule editors; mention input; the client portal as a client-grant user; the integrations one-time secret page; the import preview.
