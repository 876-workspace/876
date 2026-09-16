# Brief 6b — Projects app: calendar, events, reminders, My Work

Repo `/root/projects/876`, branch `feature/projects-phase-6-calendar`. Read `plans/2026-09-15-projects-phase-6/plan.md` — binding. Note decision 4: **reminders are intent only, nothing is delivered.** The UI must not say a reminder will be sent, emailed or notified; it says when it is due. Decision 6: **no external calendar sync UI at all.**

Hard rules: no commit/branch/prisma. No `eslint-disable`/`as any`/`@ts-ignore`. No server actions. No run logs. One verification command at a time. Read budget: only the files named here.

## Contracts (source of truth — read these)
`packages/projects/src/resources/calendar.ts`, `events.ts`, `reminders.ts`, `my-work.ts`; types in `packages/projects/src/types.ts`.

## Patterns to copy (read only these)
- page + Suspense + toolbar: `apps/projects/src/app/(app)/cycles/page.tsx`
- data loader: `apps/projects/src/features/projects/components/cycle-list-data.tsx`
- form: `apps/projects/src/features/projects/components/cycle-form.tsx`
- route handler: `apps/projects/src/app/api/cycles/route.ts`
- browser client: `apps/projects/src/lib/client/cycles.ts`
- nav: `apps/projects/src/components/shell/nav-config.ts` + `nav-icons.tsx` + `nav-config.test.ts`

## Deliver
1. Nav entries `Calendar` (`/calendar`, icon `calendar`, CalendarIcon) and `My Work` (`/my-work`, icon `my-work`, InboxIcon) after Cycles, both `requires: { module: 'projects', permission: 'projects.view' }`; update `nav-config.test.ts`.
2. Route handlers: `app/api/events/route.ts` (POST), `api/events/[eventId]/route.ts` (PATCH, DELETE), `api/events/[eventId]/attendees/route.ts` (POST), `api/events/[eventId]/attendees/[userId]/route.ts` (PATCH response, DELETE), `api/reminders/route.ts` (POST), `api/reminders/[reminderId]/route.ts` (PATCH, DELETE). Strict zod; actor id from auth, never the body.
3. Browser clients `apps/projects/src/lib/client/events.ts` and `reminders.ts`.
4. `/calendar` page: month grid (default), week and list views switched by a `view` search param; entries coloured by kind with a legend; project filter; forward/back navigation by `from`/`to` search params resolved server-side. Data loads in an async component behind `<Suspense>`; the toolbar, view switch and month label render immediately. Entry click links to the underlying record (`/issues/<identifier>`, `/phases/<id>`, `/projects/<id>`, or opens the event panel).
5. Event create/edit pages (`/calendar/events/new`, `/calendar/events/[eventId]/edit`) with: kind (event or meeting), title, description, project, optional phase and work item, all-day toggle, start/end, location, meeting URL, attendee picker (member select, multiple), and a recurrence section (frequency, interval, weekdays for weekly, ends never/on date/after N). Attendee responses shown on the detail with accept/decline/tentative actions.
6. Reminder UI as a section on work-item detail and on the event page: list this user's reminders for that record with add and remove. Copy must read like "Due 2 hours before the due date" — never "we will notify you".
7. `/my-work` page: three sections — assigned open work items, upcoming events, reminders due — each its own `<Suspense>` boundary, with an empty state per section (short title only, no explanatory paragraph).
8. Tests, floor ≥ 30 `it()`: each route handler (403, 422, success envelope, actor binding), calendar view switching and month navigation, entry href per kind, recurrence form building the right payload, attendee response action, reminder add/remove calling the client once, My Work sections rendering and empty states, nav-config.

## Verify
pnpm --filter @876/projects-app typecheck
pnpm --filter @876/projects-app lint
pnpm --filter @876/projects-app test
node scripts/check-app-structure.mjs
pnpm check:rsc-boundaries

## Report
`plans/2026-09-15-projects-phase-6/reports/command-code/6b-app.md`: files, counted tests, decisions, unverified items.
