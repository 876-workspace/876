# Announcements — an app-wide bar, never a takeover

Read this before showing any app-wide condition to a viewer: offline, a waiting
update, scheduled maintenance, a promotion, a policy notice. It also fixes the
shape of the future console-managed announcement feed, so the first real
implementation does not invent a second one.

Companion to `error-handling.md` (errors are values, rendered in place),
`app-layout.md` (page chrome), and `production-render-errors.md` (nothing but
serializable data crosses the RSC boundary).

## The rule

**An app-wide message appears in a bar at the top of the content column. It
never replaces the page, never redirects, and never steals focus.**

Losing connectivity used to swap the whole screen for the service worker's
offline document. That threw away whatever the viewer was looking at — an
open form, a half-read record — to tell them something a single line could
have said, and it could not be undone without a reload. A bar states the
condition, keeps the app usable underneath, and disappears by itself when the
condition clears.

The static offline document (`/offline.html`, `/~offline`) remains only as the
last resort it always should have been: a **cold navigation** that failed with
no app loaded at all. It is not the runtime offline experience.

## Where it lives

`@876/ui/announcements`:

| Export               | What it is                                                  |
| -------------------- | ----------------------------------------------------------- |
| `AnnouncementRegion` | the stack, mounted once per app directly under the topbar   |
| `AnnouncementBar`    | one bar; presentation only                                  |
| `useConnectivity`    | measured reachability (probe, not `navigator.onLine` alone) |
| `useAppUpdate`       | a service worker version installed and waiting              |
| `Announcement`       | the plain-data contract every source produces               |

Every shell app mounts `<AnnouncementRegion />` between `</AppShellHeader>` and
`<AppShellBody>`. A new app does the same; do not build a second banner.

## The contract

An `Announcement` is plain, structurally cloneable data — `id`, `tone`,
`message`, optional `title`, `actions`, `dismissible`, `priority`. An action is
an **href** or a **named action key** (`reload`, `apply-update`, `dismiss`),
never a function: a server component resolves announcements and passes them
down, and a function prop crossing that boundary crashes the route in
production.

- `id` is durable. Dismissal is remembered per id, per viewer, in
  `localStorage` — a convenience, never the source of truth.
- A runtime condition is **not dismissible**. The offline bar clears when
  connectivity returns; a dismissed one could not tell the truth.
- Copy is one short line. No paragraphs (`CLAUDE.md` → UI Copy).
- Tone maps onto existing status colours. `promo` uses `brand-accent`, so an
  organization's accent applies (`app-theming.md`).

## Connectivity is measured, not asked

`navigator.onLine` answers "is there an interface", not "can we reach the
origin". A laptop still associated with a Wi-Fi network whose router lost its
uplink reports `true` forever. So `offline` is trusted and `online` is
confirmed with a cheap same-origin `HEAD` probe on a backoff, re-armed on
`online`, `pageshow`, and visibility change. `HEAD` bypasses Serwist, which
registers its routes for `GET`.

## The console-managed feed (not built)

`AnnouncementRegion`'s `announcements` prop is the seam. When the platform
grows editorial announcements — maintenance windows, promotions, release
notes — they are **platform data** and therefore belong to the core identity
API (`platform-services.md` bucket 1), targeted by app, organization, role, or
account, with a window (`startsAt`/`endsAt`), authored in Console and read by
each app's server through its bounded client, then passed as plain data.

Until that exists, do not fake it: no app-local announcement table, no
hard-coded editorial copy in a shell, no second delivery path.

## Do not

- Do not replace, cover, or redirect the page to report an app-wide condition.
- Do not use a toast for a condition that persists (see `error-handling.md`).
- Do not make a runtime condition dismissible.
- Do not pass a function as an announcement action.
- Do not read `navigator.onLine` alone to decide the app is offline.
- Do not mount a second announcement bar in an app.
- Do not store editorial announcements in an app-local datastore.
