# Widgets system — external AI implementation brief

**Purpose:** Self-contained handoff for an external AI (no repo access) to design an implementation plan for:

1. **Richer active-item highlighting** on the widget icon rail
2. **Larger widget icons**
3. **Per-widget size policy** — force a permanent size, or allow only a subset of sizes
4. **User-resizable panels** for widgets that allow multiple sizes (Notepad today is effectively locked to a fixed default; Live Logs is forced `xl`)
5. Optional **“fill to sidebar”** max width (panel grows until main column hits its minimum)
6. **Playful / modern / colorful size-control icons** for the UX of size changing

This document captures **how widgets work today** with real architecture, schemas, file paths, and substantial source. Paths are relative to the monorepo root.

**Companion docs (already in repo):**

| Doc                                   | Role                                            |
| ------------------------------------- | ----------------------------------------------- |
| `docs/widgets.md`                     | Boundary model, runtime, env vars, feature keys |
| `plans/widgets-convex-to-postgres.md` | Historical Convex → Postgres migration plan     |

---

## Table of contents

1. [Product vision (what we want next)](#1-product-vision-what-we-want-next)
2. [System map](#2-system-map)
3. [Runtime request path](#3-runtime-request-path)
4. [Catalog & metadata](#4-catalog--metadata)
5. [Size system today (critical for the plan)](#5-size-system-today-critical-for-the-plan)
6. [Shell integration (where the dock lives)](#6-shell-integration-where-the-dock-lives)
7. [WidgetPopout — rail, panel, dock, popout (full behavior + code)](#7-widgetpopout--rail-panel-dock-popout-full-behavior--code)
8. [Host widget bar (Console)](#8-host-widget-bar-console)
9. [Shared dock (Billing / Couriers)](#9-shared-dock-billing--couriers)
10. [Existing widgets](#10-existing-widgets)
11. [Notepad deep dive](#11-notepad-deep-dive)
12. [Database schemas](#12-database-schemas)
13. [Widgets API service layer](#13-widgets-api-service-layer)
14. [Host pure-transport routes](#14-host-pure-transport-routes)
15. [Feature flags](#15-feature-flags)
16. [CSS / design tokens](#16-css--design-tokens)
17. [Console admin surfaces](#17-console-admin-surfaces)
18. [File inventory](#18-file-inventory)
19. [Gaps vs desired size feature](#19-gaps-vs-desired-size-feature)
20. [Suggested plan shape for the external AI](#20-suggested-plan-shape-for-the-external-ai)

---

## 1. Product vision (what we want next)

### 1.1 Visual polish

- Active widget on the rail should feel **clearly selected** (stronger highlight than today’s inset shadow + soft ring).
- Icons should be **larger** than the current ~18px (`size-[1.125rem]`) inside a `size-10` (40px) hit target.

### 1.2 Size policy model (desired)

Today sizes are ad hoc. Desired model (for planning — not implemented):

| Concept             | Meaning                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------- |
| **Allowed sizes**   | Subset of `sm \| md \| lg \| xl` (and possibly a new `fill` / `max` size) a widget may use    |
| **Default size**    | Initial size when opened                                                                      |
| **Locked size**     | Allowed set length 1 → user cannot change size (current Live Logs ≈ locked `xl`)              |
| **User-resizable**  | Allowed set length ≥ 2 → UI to cycle/pick size                                                |
| **Fill-to-sidebar** | Panel grows until main content column would drop below `MIN_MAIN_COLUMN_WIDTH_PX` (600 today) |

Example intents:

- **Notepad:** default `md` (or `sm`), allow `sm | md | lg | xl | fill` so notes can grow large.
- **Live Logs:** force `xl` only (or allow `lg | xl`).
- Future dense tools might force `sm` permanently.

### 1.3 Size UX affordance

A modern, colorful control in the **panel header** (near dock / close) to change size — playful icons for sm/md/lg/xl/fill rather than a plain text dropdown only.

---

## 2. System map

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Host apps (Next.js)                                                      │
│  apps/console · apps/billing · apps/couriers                             │
│                                                                          │
│  Shell: AppShellBody = [ AppShellMain | Widget dock ]                    │
│  Browser panels: @876/widgets/react                                      │
│  Same-origin: /api/widgets/*  (session + feature gate)                   │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │ server-only HTTP
                                │ WIDGETS_API_URL + WIDGETS_SERVICE_KEY
                                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ packages/widgets                                                         │
│  catalog · contracts (Zod) · server client · browser notes client · UI   │
│  NO database connection                                                  │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ apps/widgets-api  (port 3005)                                            │
│  Prisma → Neon Postgres (WIDGETS_DATABASE_URL only here)                 │
│  /api/v1/notes · /api/v1/admin/notes · health                            │
└──────────────────────────────────────────────────────────────────────────┘
```

### Packages / apps

| Path               | Package / app      | Role                                                         |
| ------------------ | ------------------ | ------------------------------------------------------------ |
| `packages/widgets` | `@876/widgets`     | Catalog, types, server/browser clients, React dock + Notepad |
| `apps/widgets-api` | `@876/widgets-api` | Sole owner of Widgets Postgres + Prisma                      |
| `apps/console`     | host               | Full dock (shared + host widgets), admin UI for widgets      |
| `apps/billing`     | host               | Shared Notepad only via `SharedWidgetDock`                   |
| `apps/couriers`    | host               | Shared Notepad via `SharedWidgetDock`                        |
| `packages/ui`      | `@876/ui`          | `AppShell*`, design tokens, icons used by hosts              |
| `apps/api`         | identity API       | Feature flag evaluation (PostHog-backed catalog)             |

### Package exports (`packages/widgets/package.json`)

```text
@876/widgets              → catalog + note types
@876/widgets/react        → dock, popout, Notepad UI, icons
@876/widgets/server       → createWidgetsClient (member)
@876/widgets/server/admin → createWidgetsAdminClient (Console only)
@876/widgets/browser      → browserNotes (fetch host /api/widgets/*)
```

### Distribution vs data ownership

Independent axes on every widget:

| Field          | Values                  | Meaning                                                  |
| -------------- | ----------------------- | -------------------------------------------------------- |
| `distribution` | `shared` \| `host`      | May appear in multiple hosts vs one host’s local catalog |
| `dataOwner`    | `widgets` \| `external` | Content in Widgets Postgres vs another domain            |

| Widget        | distribution | dataOwner                                    | Hosts                                                                                  |
| ------------- | ------------ | -------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Notepad**   | shared       | widgets                                      | console, billing, couriers (implemented); enterprise/876 supported but not fully wired |
| **Live Logs** | host         | external (core audit via `$876.auditEvents`) | console only                                                                           |

---

## 3. Runtime request path

### Notepad (widget-owned data)

```text
Browser NotepadWidget
  → browserNotes.list/create/update/delete
  → GET/POST/PATCH/DELETE  {host}/api/widgets/notepad[/:id]
       require session + notepad feature flags
  → $widgets = createWidgetsClient({ WIDGETS_API_URL, WIDGETS_SERVICE_KEY })
  → apps/widgets-api  /api/v1/notes
       x-internal-key + x-876-actor-user-id
  → Prisma notepad_notes (scoped by owner_account_id = actor)
```

### Live Logs (external data)

```text
Console layout (RSC)
  → if live_logs enabled: $876.auditEvents.list({ limit: 12 })
  → pass auditEvents into WidgetBar → LiveLogsWidget (client, no Widgets API)
```

### Auth headers (server → widgets-api)

From `packages/widgets/src/server/request.ts`:

- `x-internal-key: WIDGETS_SERVICE_KEY`
- `x-876-actor-user-id: <876 user id>`
- Admin calls also send `x-876-widget-role: admin`

Validated in `apps/widgets-api/src/lib/auth/service-key.ts` (SHA-256 timing-safe compare).

---

## 4. Catalog & metadata

### Shared catalog — `packages/widgets/src/catalog.ts`

Key types and the only shared widget today (Notepad):

```ts
export type WidgetHost =
  | 'console'
  | 'billing'
  | 'couriers'
  | 'enterprise'
  | '876'

export type WidgetDistribution = 'shared' | 'host'
export type WidgetDataOwner = 'widgets' | 'external'

export type WidgetVisual =
  | { kind: 'icon'; icon: 'notepad' | 'terminal' }
  | { kind: 'image'; src: string; alt: string }

export interface WidgetFeatureKeys {
  parent: string
  widget: string
}

// Metadata includes:
// object, id, name, description, version, visual,
// ownership: 'account' | 'organization' | 'workspace',
// dataOwner, defaultPanel: { width, height },
// supportedHosts, implementedHosts, administration,
// + features (platform + per-app for shared; apps only for host)

export const notepadWidgetMetadata = {
  object: 'widget',
  id: 'notepad',
  name: 'Notepad',
  description:
    'Sticky-style notes with Editor.js rich text, colors, pin-to-top, search, and auto-save that follow your 876 account across apps.',
  version: '2.0.0',
  visual: { kind: 'icon', icon: 'notepad' },
  distribution: 'shared',
  dataOwner: 'widgets',
  ownership: 'account',
  defaultPanel: { width: 384, height: 520 }, // ← matches SIZE_MAP.md (384)
  supportedHosts: ['console', 'billing', 'couriers', 'enterprise', '876'],
  implementedHosts: ['console', 'billing', 'couriers'],
  features: {
    platform: {
      parent: 'platform_widgets',
      widget: 'platform_widgets_notepad',
    },
    apps: {
      console: {
        parent: 'console_widgets',
        widget: 'console_widgets_notepad',
      },
      billing: {
        parent: 'billing_widgets',
        widget: 'billing_widgets_notepad',
      },
      couriers: {
        parent: 'couriers_widgets',
        widget: 'couriers_widgets_notepad',
      },
    },
  },
  administration: {
    canListContent: true,
    canEditContent: true,
    canDeleteContent: true,
  },
} as const satisfies WidgetMetadata

export const widgetCatalog = [notepadWidgetMetadata] as const
```

**Enablement logic:** for shared widgets, **all** of platform parent, platform widget, app parent, and app widget feature slugs must be present in the evaluated set (`isWidgetEnabled` / `getRequiredWidgetFeatureSlugs`).

### Console host catalog — `apps/console/src/components/widgets/widget-catalog.ts`

```ts
export const liveLogsWidgetMetadata = {
  object: 'widget',
  id: 'live_logs',
  name: 'Live logs',
  // ...
  distribution: 'host',
  dataOwner: 'external',
  ownership: 'workspace',
  defaultPanel: { width: 720, height: 520 }, // ← SIZE_MAP.xl
  supportedHosts: ['console'],
  implementedHosts: ['console'],
  features: {
    apps: {
      console: {
        parent: 'console_widgets',
        widget: 'console_widgets_live_logs',
      },
    },
  },
  // administration all false
} as const satisfies WidgetMetadata

export const consoleWidgetCatalog = [
  ...widgetCatalog,
  liveLogsWidgetMetadata,
] as const
```

**Important:** Catalog has `defaultPanel: { width, height }` but the **React size system does not read it**. Width comes from `WidgetPopoutSize` tokens or `sizeByItem` / `defaultWidth` on `Panel`.

---

## 5. Size system today (critical for the plan)

### Constants — `packages/widgets/src/react/widget-popout.tsx`

```ts
export type WidgetPopoutSize = 'sm' | 'md' | 'lg' | 'xl'
export type WidgetPanelPresentation = 'popout' | 'docked'

const SIZE_MAP: Record<WidgetPopoutSize, number> = {
  sm: 320,
  md: 384,
  lg: 520,
  xl: 720,
}

const RAIL_WIDTH_PX = 52
const RAIL_WIDTH_REM = '3.25rem'
const PANEL_GUTTER_PX = 24
const PANEL_VERTICAL_INSET_PX = 10
const MIN_MAIN_COLUMN_WIDTH_PX = 600
```

### Resolution

```ts
function resolvePanelWidth(
  activeItem: string | null,
  size: WidgetPopoutSize,
  sizeByItem: Partial<Record<string, WidgetPopoutSize>> | undefined,
  defaultWidth: number | undefined
) {
  const resolvedSize = activeItem ? (sizeByItem?.[activeItem] ?? size) : size
  return defaultWidth ?? SIZE_MAP[resolvedSize]
}
```

### How hosts set size

| Host / widget                       | Mechanism                                                             | Effective width      |
| ----------------------------------- | --------------------------------------------------------------------- | -------------------- |
| Console `WidgetBar`                 | `<PopoutBar.Panel size="md" sizeByItem={…}>`                          | Default **md (384)** |
| Console Live Logs                   | `panelSize: 'xl'` in `widgets-config` → `sizeByItem.live_logs = 'xl'` | **xl (720)** locked  |
| Console Notepad                     | no `panelSize`                                                        | inherits **md**      |
| Billing/Couriers `SharedWidgetDock` | `<WidgetPopout.Panel size="md">` only                                 | **md** for all       |

There is **no**:

- user control to change size at runtime
- `allowedSizes` / `lockedSize` on catalog metadata
- `fill` / max-to-sidebar size token
- persistence of chosen size (cookie/localStorage/DB)
- height-based sizing from `defaultPanel.height` (height is viewport-driven)

### Dock vs popout vs “cover until sidebar”

| Mode                 | Behavior                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------- |
| **popout** (default) | `position: fixed` card floating left of the rail; main page still full width under the overlay                |
| **docked**           | In-flow column; main content **shrinks** by panel width; requires `availableWidth - rail - panelWidth >= 600` |
| Auto undock          | If viewport too narrow for dock, presentation forced back to `popout`                                         |

“Cover everything until the sidebar” in **docked** mode is approximately: set panel width to  
`availableWidth - RAIL_WIDTH_PX - MIN_MAIN_COLUMN_WIDTH_PX`  
(subject to max constraints). That formula is **not** implemented as a named size yet; only the dock eligibility check uses those constants.

---

## 6. Shell integration (where the dock lives)

### App shell — `packages/ui/src/components/app-shell.tsx`

```tsx
// AppShellContent: min-w-0 so a sibling widget dock can sit without overflow
// AppShellBody: flex row under the topbar
// AppShellMain: flex-1 scrollable page
// Widget dock is NOT inside AppShell — hosts append it as sibling of AppShellMain
```

Structure:

```text
AppShell
  AppShellSidebarArea → left app sidebar
  AppShellContent
    AppShellHeader (h-14 / 56px)
    AppShellBody  (flex row)
      AppShellMain  → page routes
      WidgetBar / SharedWidgetDock  → rail + panel
```

### Console — `apps/console/src/components/console-shell.tsx`

```tsx
<AppShellBody>
  <AppShellMain>{children}</AppShellMain>
  {enabledWidgetIds.length > 0 && (
    <WidgetBar auditEvents={auditEvents} enabledWidgetIds={enabledWidgetIds} />
  )}
</AppShellBody>
```

### Console layout enables widgets — `apps/console/src/app/(app)/layout.tsx`

```tsx
const [user, { enabledWidgetIds, uiFeatures }] = await Promise.all([
  requireConsoleAccount(...),
  getConsoleFeatures({ userId, widgets: consoleWidgetCatalog }),
])

const auditEvents = enabledWidgetIds.includes('live_logs')
  ? ((await $876.auditEvents.list({ limit: 12 })).data?.data ?? [])
  : []
```

### Feature evaluation — `apps/console/src/lib/features.ts`

```tsx
const enabledWidgetIds = widgets
  .filter((widget) => isWidgetEnabled(widget, 'console', enabledSlugs))
  .map((widget) => widget.id)
```

---

## 7. WidgetPopout — rail, panel, dock, popout (full behavior + code)

**Source of truth:** `packages/widgets/src/react/widget-popout.tsx` (~662 lines).  
Console re-exports as `PopoutBar` from `apps/console/src/components/widgets/popout-bar.tsx`.

### Compound API

```ts
export const WidgetPopout = { Root, Rail, Trigger, Panel, Content }
// also: useWidgetPanelLifecycle()
```

### Root responsibilities

- State: `activeItem: string | null`, `presentation: 'popout' | 'docked'`
- Measures parent width via `ResizeObserver` → `availableWidth`
- Mobile: `max-width: 767px` hides dock (`hidden md:flex` on root)
- Escape closes active panel
- `registerBeforeDeactivate(id, handler)` — async gates before close/switch (Notepad uses this to flush saves / reset editor)
- Renders `<aside data-slot="widget-dock" data-presentation=…>`

### Rail (icon strip)

- Fixed **52px** width
- Classes: `876-widget-rail`, backdrop blur, border on dock side
- Children are `Trigger` buttons

### Trigger (icon button) — **active highlight lives here**

```tsx
// Hit target
'size-10' // 40×40
// Icon forced to 18px via CSS
'[&_svg]:size-[1.125rem]'

// Active styles (today):
isActive
  ? [
      'bg-[var(--876-nav-active-bg)] text-[var(--876-nav-active-fg)]',
      'shadow-[inset_0_1px_0_color-mix(in_oklab,white_35%,transparent),0_1px_2px_…]',
      'ring-1 ring-[color-mix(in_oklab,var(--876-nav-active-fg)_22%,transparent)]',
    ]
  : 'text-muted-foreground hover:bg-muted/90 hover:text-foreground …'
```

Motion: `whileHover={{ scale: 1.05 }}`, `whileTap={{ scale: 0.94 }}`.  
Tooltip: animated label on hover/focus.

**UX gap:** icons are small; active state reuses nav-active tokens with a soft ring — can feel subtle on dense rails.

### Panel

- Resolves width from size map / sizeByItem
- **popout:** fixed, spring slide in from side, gutter from rail, vertical inset 10px below navbar
- **docked:** width transitions 0 ↔ size; zero width when closed
- Header actions are on **Content**, not Panel

### Content (per-widget body + header)

Lazy mount: first activation mounts permanently (`hasBeenActiveRef`); inactive content is `hidden` + `inert` (state preserved).

Header (`h-12`):

1. Optional icon (currently forced `size-6` / 24px in header)
2. Title
3. Dock / Pop-out toggle
   - Docked → `SidebarPanelIcon` “Pop out”
   - Popout → `Minus` “Dock” (disabled when `!canDock`)
4. Close (`X`)

Body: scrollable region wrapping widget panel component.

### Lifecycle hook

```ts
export function useWidgetPanelLifecycle() {
  return useContext(WidgetContentLifecycleContext)
}
// Content registers: registerBeforeDeactivate(handler) → boolean | void | Promise
// Returning false blocks close/switch.
```

### Full file location for external AI to re-read later

When pasting this brief, attach the full contents of:

- `packages/widgets/src/react/widget-popout.tsx` (entire file — behavior source of truth)

Key excerpts already above cover size map, active styles, dock rules, and API.

---

## 8. Host widget bar (Console)

### `apps/console/src/components/widgets/widget-bar.tsx`

```tsx
'use client'

const NAVBAR_HEIGHT = 56 // matches h-14 header

export function WidgetBar({ auditEvents, enabledWidgetIds }) {
  const enabledWidgets = widgets.filter((w) => enabledWidgetIdSet.has(w.id))
  const sizeByItem = Object.fromEntries(
    enabledWidgets.filter((w) => w.panelSize).map((w) => [w.id, w.panelSize])
  )

  return (
    <PopoutBar.Root side="right" navbarHeight={NAVBAR_HEIGHT}>
      <PopoutBar.Panel size="md" sizeByItem={sizeByItem}>
        {enabledWidgets.map((widget) => (
          <PopoutBar.Content
            key={widget.id}
            id={widget.id}
            title={widget.label}
            icon={createElement(widget.icon, {
              className: 'block size-[1.125rem] shrink-0',
              width: 18,
              height: 18,
            })}
          >
            {createElement(widget.panel, { auditEvents })}
          </PopoutBar.Content>
        ))}
      </PopoutBar.Panel>

      <PopoutBar.Rail>
        {enabledWidgets.map((widget) => (
          <PopoutBar.Trigger
            key={widget.id}
            id={widget.id}
            label={widget.label}
            icon={createElement(widget.icon, {
              className: 'block size-[1.125rem] shrink-0',
              width: 18,
              height: 18,
            })}
          />
        ))}
      </PopoutBar.Rail>
    </PopoutBar.Root>
  )
}
```

### `apps/console/src/components/widgets/widgets-config.ts`

```tsx
export type Widget = {
  id: string
  label: string
  icon: IconComponent
  panel: ComponentType<WidgetPanelProps>
  panelSize?: PopoutSize // only live_logs sets 'xl'
}

const widgetRenderers = {
  notepad: {
    icon: NotepadIcon as IconComponent,
    panel: NotepadWidget,
  },
  live_logs: {
    icon: Terminal,
    panel: LiveLogsWidget,
    panelSize: 'xl',
  },
}
```

### Console Notepad host wrapper

`apps/console/src/components/widgets/notepad-widget.tsx` simply re-exports shared panel:

```tsx
export function NotepadWidget({}: WidgetPanelProps) {
  return <SharedNotepadWidget />
}
```

---

## 9. Shared dock (Billing / Couriers)

### `packages/widgets/src/react/widget-dock.tsx`

```tsx
export function SharedWidgetDock({
  enabledWidgetIds,
  navbarHeight = 56,
}: {
  enabledWidgetIds: readonly string[]
  navbarHeight?: number
}) {
  // filters sharedWidgetRenderers (currently only Notepad)
  return (
    <WidgetPopout.Root side="right" navbarHeight={navbarHeight}>
      <WidgetPopout.Panel size="md">
        {/* Content per enabled shared widget */}
      </WidgetPopout.Panel>
      <WidgetPopout.Rail>{/* Triggers */}</WidgetPopout.Rail>
    </WidgetPopout.Root>
  )
}
```

- **No** `sizeByItem` — every shared widget is md.
- Billing: `features.widgets.notepad ? <SharedWidgetDock enabledWidgetIds={['notepad']} />`
- Couriers: passes `enabledWidgetIds` from feature evaluation + `navbarHeight={64}`

---

## 10. Existing widgets

### 10.1 Notepad (shared, widgets data)

See [§11](#11-notepad-deep-dive).

### 10.2 Live Logs (Console host, external data)

File: `apps/console/src/components/widgets/live-logs-widget.tsx` (~268 lines).

- Client component receiving `auditEvents: AdminAuditEvent[]` from RSC layout
- Search/filter over event name, path, app, request id, etc.
- Tone badges by event name (error/success/delete…)
- Link out to full audit UI
- **No** Widgets API / Notepad-style persistence
- Forced panel size **xl** via config

---

## 11. Notepad deep dive

### Architecture

```text
NotepadWidgetPanel
  ├─ list state + refresh via browserNotes
  ├─ selectedId / editorSessionKey / pendingEntry (draft_*)
  ├─ registerBeforeDeactivate → clear selection when panel closes/switches
  ├─ NotepadNotesView  (grid home)
  └─ NotepadEditor     (single note)
        ├─ title input
        ├─ color palette + pin
        ├─ NotepadBodyEditor (Editor.js)
        ├─ auto-save 650ms
        └─ flush-on-close via useWidgetPanelLifecycle
```

### Key files

| File                                                   | Role                                                 |
| ------------------------------------------------------ | ---------------------------------------------------- |
| `packages/widgets/src/react/notepad-widget.tsx`        | Panel state machine, list/editor switch              |
| `packages/widgets/src/react/notepad-notes-view.tsx`    | Sticky grid, search, new note                        |
| `packages/widgets/src/react/notepad-editor.tsx`        | Edit shell, auto-save, pin, delete                   |
| `packages/widgets/src/react/notepad-body-editor.tsx`   | Editor.js mount (Header, List, Underline, Checklist) |
| `packages/widgets/src/react/notepad-editor-data.ts`    | JSON body parse/serialize, plain text                |
| `packages/widgets/src/react/notepad-editorjs-theme.ts` | Editor.js CSS theme                                  |
| `packages/widgets/src/react/notepad-format.ts`         | Colors, sticky CSS string, sort/pin, previews        |
| `packages/widgets/src/react/notepad-draft.ts`          | `draft_*` ids, title defaults                        |
| `packages/widgets/src/react/notepad-icon.tsx`          | Colorful custom SVG notepad icon                     |
| `packages/widgets/src/browser/notes.ts`                | Browser HTTP client                                  |
| `packages/widgets/src/types/notes.ts`                  | Zod contracts                                        |

### Note contracts — `packages/widgets/src/types/notes.ts`

```ts
export const noteColorSchema = z.enum([
  'yellow',
  'pink',
  'blue',
  'green',
  'purple',
  'gray',
])

export const notepadNoteSchema = z.object({
  object: z.literal('note'),
  id: z.string(),
  owner_account_id: z.string(),
  title: z.string(),
  body: z.string(),
  color: noteColorSchema.nullable(),
  pinned: z.boolean(),
  created_at: z.number(), // Unix seconds
  updated_at: z.number(),
})

export const noteListSchema = z.object({
  object: z.literal('list'),
  data: z.array(notepadNoteSchema),
  has_more: z.boolean(),
  url: z.string(),
  total_count: z.number().nullable(),
})

export const deletedNoteSchema = z.object({
  object: z.literal('note'),
  id: z.string(),
  deleted: z.literal(true),
})
```

### Draft lifecycle

- New note creates local `draft_<uuid>` pending entry — **no server row** until non-empty content saves
- Empty draft abandon → no API create
- After create, `editorSessionKey` stays stable so Editor.js does not remount mid-type
- Closing panel: `registerBeforeDeactivate` on list view clears selection; editor view calls `saveEntry()` without blocking

### Sticky colors

`NOTE_COLOR_PALETTE` + injected `NOTE_STICKY_COLOR_CSS` use CSS variables (`--sticky-surface`, dark variants) so host Tailwind does not need to scan the package for color classes.

### Notepad icon (already playful)

Custom multi-gradient SVG (paper, amber cover, binder rings, blue lines) — good precedent for size-control icons.

### Panel behavior vs size

Notepad UI is a **2-column sticky grid** (`grid-cols-2`) inside the panel width. At **sm (320)** cards are tight; at **xl (720)** or fill they breathe. There is no layout mode that switches to 1 / 3 columns by size today — a size feature may want responsive column counts.

---

## 12. Database schemas

**Only `apps/widgets-api` connects.** Hosts never get `WIDGETS_DATABASE_URL`.

### Prisma generator — `apps/widgets-api/prisma/schema/schema.prisma`

```prisma
generator client {
  provider = "prisma-client"
  output   = "../../src/lib/db/generated/prisma"
}

datasource db {
  provider = "postgresql"
}
```

### `notepad_notes` — `apps/widgets-api/prisma/schema/notepad-note.prisma`

```prisma
model NotepadNote {
  id              String  @id
  ownerAccountId  String  @map("owner_account_id")
  title           String
  body            String
  color           String?
  pinned          Boolean @default(false)
  createdAt       Int     @map("created_at")
  updatedAt       Int     @map("updated_at")
  legacyConvexId  String? @unique @map("legacy_convex_id")

  @@index([ownerAccountId, updatedAt(sort: Desc)], name: "notepad_notes_owner_updated_idx")
  @@index([updatedAt(sort: Desc)], name: "notepad_notes_updated_idx")
  @@map("notepad_notes")
}
```

### `widget_audit_events` — admin mutations trail

```prisma
model WidgetAuditEvent {
  id                   String @id
  widgetId             String @map("widget_id")
  action               String
  resourceId           String @map("resource_id")
  actorUserId          String @map("actor_user_id")
  targetOwnerAccountId String @map("target_owner_account_id")
  occurredAt           Int    @map("occurred_at")

  @@index([widgetId, occurredAt], name: "widget_audit_events_widget_occurred_idx")
  @@index([resourceId, occurredAt], name: "widget_audit_events_resource_occurred_idx")
  @@map("widget_audit_events")
}
```

### SQL migration excerpt

`apps/widgets-api/prisma/migrations/20260716000000_init_widgets/migration.sql` creates both tables with the indexes above.

**There is no table for per-user panel size preferences.** Size is purely client-side config today.

---

## 13. Widgets API service layer

### Routes

| Method       | Path                      | Auth                 | Service                   |
| ------------ | ------------------------- | -------------------- | ------------------------- |
| GET          | `/api/v1/notes`           | service + actor      | listNotes (owner = actor) |
| POST         | `/api/v1/notes`           | service + actor      | createNote                |
| PATCH        | `/api/v1/notes/:id`       | service + actor      | updateNote (must own)     |
| DELETE       | `/api/v1/notes/:id`       | service + actor      | deleteNote                |
| GET          | `/api/v1/admin/notes`     | service + admin role | listAllNotes              |
| PATCH/DELETE | `/api/v1/admin/notes/:id` | service + admin      | update/delete + audit     |

### Service layout

```text
apps/widgets-api/src/lib/service/
  notes/
    create.ts · update.ts · delete.ts · list.ts
    serialize.ts · validate.ts · types.ts · index.ts
  result.ts
```

List pagination: cursor by `starting_after` note id → `updatedAt < cursor.updatedAt`, `take: limit+1`, `has_more`.

Serialize maps Prisma camelCase → Stripe-style snake_case resource with `object: 'note'`.

---

## 14. Host pure-transport routes

### Console (pattern for all hosts)

| Route                                                          | Role                                        |
| -------------------------------------------------------------- | ------------------------------------------- |
| `apps/console/src/app/api/widgets/notepad/route.ts`            | GET list, POST create                       |
| `apps/console/src/app/api/widgets/notepad/[id]/route.ts`       | PATCH, DELETE                               |
| `apps/console/src/app/api/widgets/admin/notepad/route.ts`      | Admin list                                  |
| `apps/console/src/app/api/widgets/admin/notepad/[id]/route.ts` | Admin patch/delete                          |
| `apps/console/src/app/api/widgets/features/[id]/route.ts`      | Feature toggle for Console widgets admin UI |

Auth: `requireNotepadMember()` checks session + `enabledWidgetIds` contains `notepad`.

Clients:

```ts
// apps/console/src/lib/widgets.ts
export const $widgets = createWidgetsClient({
  baseUrl: process.env.WIDGETS_API_URL,
  serviceKey: process.env.WIDGETS_SERVICE_KEY,
})
export const $widgetsAdmin = createWidgetsAdminClient({ ... })
```

Billing and Couriers mirror member notepad routes under their own `src/app/api/widgets/notepad/`.

### Browser client — `packages/widgets/src/browser/notes.ts`

```ts
const MEMBER_BASE = '/api/widgets/notepad'
const ADMIN_BASE = '/api/widgets/admin/notepad'

export const browserNotes = {
  list, create, update, delete,
  listAll, adminUpdate, adminDelete,
}
// always credentials: 'same-origin', { data, error } envelope
```

---

## 15. Feature flags

| Layer                    | Keys                                                                      |
| ------------------------ | ------------------------------------------------------------------------- |
| Platform (shared master) | `platform_widgets`, `platform_widgets_notepad`                            |
| Console                  | `console_widgets`, `console_widgets_notepad`, `console_widgets_live_logs` |
| Billing                  | `billing_widgets`, `billing_widgets_notepad`                              |
| Couriers                 | `couriers_widgets`, `couriers_widgets_notepad`                            |

Master **AND** child must be on (`isWidgetEnabled`). Evaluation is server-side via `$876.features.evaluate` — never client-side PostHog.

Console groups widgets under feature admin UI (`apps/console/src/lib/feature-groups.ts`).

---

## 16. CSS / design tokens

### Global dock chrome — `packages/ui/src/876.css`

```css
/* Widget dock (in-flow right column) */
:where(:not(.dark)) [class~='876-widget-rail'] {
  border-color: var(--border-strong);
}
.dark [class~='876-widget-rail'] {
  border-color: oklch(1 0 0 / 10%);
}
/* same pattern for 876-widget-panel */
```

### Active rail highlight tokens

Uses CSS variables:

- `--876-nav-active-bg`
- `--876-nav-active-fg`

(same as sidebar active nav)

### Sticky note CSS

Injected string `NOTE_STICKY_COLOR_CSS` in notepad format module (`.note-sticky-card`, `.note-new-button`, dark variants).

### Motion

`motion` package (`motion/react`) for spring enter/exit, trigger hover, tooltips.

---

## 17. Console admin surfaces

Under `apps/console/src/app/(app)/widgets/`:

| Route                          | Purpose                                    |
| ------------------------------ | ------------------------------------------ |
| `/widgets`                     | Catalog table of widgets                   |
| `/widgets/[widgetSlug]`        | Overview (usage placeholders + definition) |
| `/widgets/[widgetSlug]/access` | Feature access toggles                     |
| `/widgets/notepad/data`        | Admin note manager (cross-account)         |

Components: `widget-overview.tsx`, `widget-access-list.tsx`, `widget-feature-toggle.tsx`, `widget-detail-header.tsx`, `widget-catalog-icon.tsx`, notepad admin manager under `notepad/data/`.

These admin pages do **not** configure panel sizes.

---

## 18. File inventory

### Shared package `packages/widgets/src/`

```text
catalog.ts
index.ts
admin.ts
types/notes.ts
types/notepad.ts
browser/notes.ts
server/client.ts
server/admin.ts
server/request.ts
server/index.ts
react/
  index.ts
  widget-popout.tsx      ← size, dock, rail, active styles
  widget-dock.tsx        ← SharedWidgetDock
  widget-provider.tsx    ← legacy no-op (old Convex auth)
  widget-loading.tsx
  notepad-*.tsx/ts       ← full Notepad UI stack
```

### Widgets API

```text
apps/widgets-api/
  prisma/schema/*
  prisma/migrations/*
  src/app/api/v1/notes/**
  src/app/api/v1/admin/notes/**
  src/lib/auth/service-key.ts
  src/lib/service/notes/**
  src/lib/db/**
```

### Console host UI

```text
apps/console/src/components/widgets/*
apps/console/src/components/console-shell.tsx
apps/console/src/app/(app)/layout.tsx
apps/console/src/app/api/widgets/**
apps/console/src/lib/widgets.ts
apps/console/src/lib/widgets-auth.ts
apps/console/src/lib/features.ts
apps/console/src/app/(app)/widgets/**
```

### Other hosts

```text
apps/billing/src/components/billing-shell.tsx
apps/billing/src/app/api/widgets/notepad/**
apps/billing/src/lib/widgets*.ts
apps/couriers/src/components/couriers-shell.tsx
apps/couriers/src/app/api/widgets/notepad/**
apps/couriers/src/lib/widgets*.ts
```

---

## 19. Gaps vs desired size feature

| Desired                   | Today                                    | Implication                                                      |
| ------------------------- | ---------------------------------------- | ---------------------------------------------------------------- |
| Bigger icons              | 18px in 40px button                      | Change Trigger + WidgetBar icon classes; possibly rail width     |
| Stronger active highlight | Soft nav-active + ring                   | New active styles (possibly gradient / accent bar / larger ring) |
| Allowed sizes per widget  | Only optional `panelSize` force one size | Extend catalog or host renderer config                           |
| User changes size         | None                                     | Panel header control + state on Root or Panel                    |
| Persist size choice       | None                                     | localStorage per host/user/widget **or** Widgets prefs table     |
| Fill until sidebar        | Only dock min-main-column math           | New size token + `resolvePanelWidth` using `availableWidth`      |
| Notepad expand sm→xl      | Fixed md (console) / md (shared dock)    | Mark notepad `allowedSizes: ['sm','md','lg','xl','fill']`        |
| Live Logs locked large    | `panelSize: 'xl'`                        | Formalize as `allowedSizes: ['xl']`                              |
| Size icons                | N/A                                      | New SVGs in widgets package (like NotepadIcon)                   |
| Responsive notepad grid   | Always 2 columns                         | Optional: columns by panel width                                 |

### Catalog field that exists but is unused for layout

```ts
defaultPanel: {
  width: number
  height: number
}
// notepad: 384×520 · live_logs: 720×520
```

Width is duplicated conceptually with `SIZE_MAP.md` / `xl` but **not wired** into `WidgetPopout`. Height is never applied (panels are viewport-height driven).

---

## 20. Suggested plan shape for the external AI

Use this document to produce an **implementation plan** (not code unless asked). Recommended plan structure:

### P0 — Design decisions

1. Size token set: keep `sm|md|lg|xl`? add `fill` / `max`?
2. Where policy lives: catalog metadata vs host-only `widgets-config` vs both
3. Persistence: session-only vs localStorage vs server prefs
4. Docked fill vs popout fill (different max width formulas)
5. Whether size UI appears only when `allowedSizes.length > 1`

### P1 — Core popout API changes

- Extend `WidgetMetadata` / renderer config with e.g.:

  ```ts
  sizes?: {
    default: WidgetPopoutSize | 'fill'
    allowed: Array<WidgetPopoutSize | 'fill'>
  }
  ```

- State: `sizeByItem` becomes **dynamic** (user overrides) rather than static config only
- Header size control component + icons
- `resolvePanelWidth` handles `fill` using `availableWidth`, rail, gutters, `MIN_MAIN_COLUMN_WIDTH_PX`
- Active rail + icon size tokens as design constants

### P2 — Host wiring

- Console `WidgetBar` / Billing `SharedWidgetDock` pass size policies
- Notepad: multi-size; Live Logs: locked xl
- Optional responsive grid for notes at larger widths

### P3 — Polish

- Animations when size changes
- A11y for size control (menu, keyboard)
- Tests: `widget-popout.test.tsx`, host bar tests, catalog tests

### Constraints the plan must respect

- No DB credentials in host apps
- No business logic in Next.js route handlers beyond auth + `$widgets` calls
- Feature-flag gating remains server-side
- Shared Notepad must work on Console, Billing, Couriers without Console-only imports
- Prefer extending `packages/widgets/src/react/widget-popout.tsx` once rather than forking per host
- Follow repo UI rules: no green primary buttons; bare verb labels where applicable

---

## Appendix A — Copy-paste map of critical absolute paths

```text
/packages/widgets/src/catalog.ts
/packages/widgets/src/react/widget-popout.tsx
/packages/widgets/src/react/widget-dock.tsx
/packages/widgets/src/react/notepad-widget.tsx
/packages/widgets/src/react/notepad-notes-view.tsx
/packages/widgets/src/react/notepad-editor.tsx
/packages/widgets/src/react/notepad-body-editor.tsx
/packages/widgets/src/react/notepad-format.ts
/packages/widgets/src/react/notepad-icon.tsx
/packages/widgets/src/browser/notes.ts
/packages/widgets/src/server/client.ts
/packages/widgets/src/server/request.ts
/packages/widgets/src/types/notes.ts
/apps/widgets-api/prisma/schema/notepad-note.prisma
/apps/widgets-api/prisma/schema/widget-audit-event.prisma
/apps/widgets-api/src/lib/service/notes/*
/apps/widgets-api/src/lib/auth/service-key.ts
/apps/console/src/components/widgets/widget-bar.tsx
/apps/console/src/components/widgets/widgets-config.ts
/apps/console/src/components/widgets/widget-catalog.ts
/apps/console/src/components/widgets/live-logs-widget.tsx
/apps/console/src/components/console-shell.tsx
/apps/console/src/app/(app)/layout.tsx
/apps/console/src/lib/features.ts
/packages/ui/src/components/app-shell.tsx
/packages/ui/src/876.css
/docs/widgets.md
```

## Appendix B — Behavioral walkthrough (user journey)

1. User loads Console with flags on → layout computes `enabledWidgetIds` e.g. `['notepad','live_logs']`.
2. `WidgetBar` mounts dock rail on the right under the topbar.
3. User clicks Notepad trigger → `activeItem = 'notepad'`, panel opens at **md (384px)** as **popout** (floating).
4. Notepad loads notes via `/api/widgets/notepad` → widgets-api → sticky grid.
5. User opens a note → editor with auto-save; lifecycle flushes on panel switch/close.
6. User clicks dock control → if `availableWidth - 52 - 384 >= 600`, presentation becomes **docked**; main column shrinks.
7. User opens Live Logs → size jumps to **xl (720)** via `sizeByItem`; Notepad state stays mounted but hidden.
8. User presses Escape → `closePopout()`; beforeDeactivate handlers run (Notepad clears editor / saves).

## Appendix C — Source dumps the external AI should request if missing

If this brief is used without the monorepo, **attach full source** of at least:

1. `packages/widgets/src/react/widget-popout.tsx` (complete)
2. `packages/widgets/src/catalog.ts` (complete)
3. `packages/widgets/src/react/notepad-widget.tsx` (complete)
4. `packages/widgets/src/react/notepad-notes-view.tsx` (complete)
5. `packages/widgets/src/react/notepad-editor.tsx` (complete)
6. `apps/console/src/components/widgets/widget-bar.tsx` + `widgets-config.ts`
7. Prisma schemas under `apps/widgets-api/prisma/schema/`

This brief already embeds the critical contracts, size constants, active styles, and architecture so a high-level plan is possible without every line of Editor.js wiring.

---

**Document status:** Research snapshot for planning. Does not implement size restrictions or UI polish — that is the external AI’s plan deliverable.
