# Console — Design System & Philosophy

The visual language for Console: a calm, layered, gray/white surface
system with restrained semantic accents. This documents the _why_ and the _what_ so
future changes stay coherent.

## Philosophy

1. **Enhance, don't reskin.** One identity — neutral gray/white surfaces with
   restrained accents. New work refines depth and hierarchy; it does not
   introduce new themes or decorative styling.
2. **Depth through a surface ladder, not contrast.** Hierarchy comes from a
   small stack of elevation steps (page → canvas → card/surface), each a
   deliberate, _perceptually uniform_ OKLCH lightness step. Steps are close
   together on purpose: the UI should read as one cohesive surface, not a set of
   high-contrast boxes.
3. **One hue, everywhere (dark).** Every dark surface shares the same cool hue
   (~250) and stays monotonic in lightness (`background < canvas < card <
surface`). Never pure black — the base is lifted and tinted so the center
   relates to the chrome instead of reading as a black hole.
4. **Borders are hairlines.** In light mode a soft visible hairline is the
   primary elevation signal; in dark mode borders are low‑alpha white that
   _separates without glowing_. Shadows are soft and layered, never heavy.
5. **Green is for primary state, not section decoration.** The 876 accent marks
   active / selected / primary only (sidebar active item, active tab, primary
   CTA). Detail-page section icons should use restrained blue, sky, violet,
   indigo, amber, or rose tints instead of adding more green surfaces.
6. **Console–scoped.** All of this is applied by overriding the shared
   `@876/ui` tokens **locally** in `src/app/globals.css`. The consumer app and
   auth pages are never touched.

## The surface ladder (current tokens)

Defined in `apps/console/src/app/globals.css` as top-level `:root` /
`.dark` overrides (kept out of `@layer base` so they win over the shared
unlayered tokens). Values are `oklch()`.

### Light

| Token                                                    | Value                      | Role                                                         |
| -------------------------------------------------------- | -------------------------- | ------------------------------------------------------------ |
| `--background`                                           | `oklch(1 0 0)` (inherited) | html body — covered by sidebar + inset; stays white          |
| `--876-canvas`                                           | `oklch(0.982 0.002 255)`   | the page backdrop (SidebarInset) — a soft gray so cards lift |
| `--card` / `--876-surface` / `--sidebar` / `--popover`   | `oklch(1 0 0)`             | elevated white surfaces                                      |
| `--border` / `--876-surface-border` / `--sidebar-border` | `oklch(0.93 0.003 258)`    | soft visible hairline                                        |
| `--876-accent-surface` / `…-hover`                       | green `13%` / `17%`        | active/selected wash                                         |

### Dark

| Token                                                    | Value                    | Role                                                |
| -------------------------------------------------------- | ------------------------ | --------------------------------------------------- |
| `--background`                                           | `oklch(0.19 0.005 250)`  | base of the ladder (lifted, hue‑tinted — not black) |
| `--876-canvas`                                           | `oklch(0.205 0.005 250)` | the page backdrop / center                          |
| `--card` / `--sidebar` / `--popover`                     | `oklch(0.222 0.005 250)` | raised surfaces                                     |
| `--876-surface`                                          | `oklch(0.23 0.005 250)`  | top elevation (top bar, widget rail, popovers)      |
| `--border` / `--876-surface-border` / `--sidebar-border` | `oklch(1 0 0 / 8%)`      | low‑alpha hairline                                  |
| `--input`                                                | `oklch(1 0 0 / 11%)`     | input edge                                          |
| `--876-green`                                            | `oklch(0.55 0.19 148)`   | accent, slightly boosted for vivid-on-dark          |

`--876-purple` (`0.52 0.2 300` light / `0.62 0.2 300` dark) backs the Apps nav
icon and was added here because it is absent upstream.

## Surfaces & components

- **Cards** use `.mc-surface`: white + soft layered shadow on the gray canvas
  (light); a glassy raised edge — inset top highlight + faint top gradient +
  layered shadow — over the ladder (dark). Shadows are deliberately gentle
  (`0 1px 2px / 0 6px 16px` light).
- **Top bar** (`.mc-topbar`): a subtle gradient + soft shadow over the header's
  hairline `border-b`, so it reads as an anchored bar rather than a blank strip.
  Visual treatment only — it does not host feature chrome by default.
- **Detail tabs** (`detail-tabs.tsx`): underline tabs. Active = 876 accent
  underline + accent text; inactive = muted, brightening on hover. No background
  fills. Tabs are route links, so active state is derived from the pathname.
  Dedicated edit pages intentionally hide inherited detail tabs through
  `DetailChromeGate` and render their own back link + title.
- **Detail headers** (`users/[username]/layout.tsx`, `orgs/[slug]/layout.tsx`):
  sticky entity chrome that keeps the avatar/logo, name, metadata, and actions
  available at the top of the detail workflow. Mobile header spacing is tighter
  than desktop spacing. Safe actions become individual bordered icon buttons
  under the metadata, while sensitive actions such as reset password, ban/unban,
  and delete stay inside the final `More` dropdown. On desktop the toolbar
  collapses to `Edit` + a compact more menu.
- **Detail action labels**: use bare verbs in mobile groups and desktop menus:
  `Edit`, `Reset`, `Ban`, `Unban`, `Export`, `Delete`. The page identity already
  supplies the user/organization context.
- **Detail accordions**: standalone `mc-surface` cards with 8px-style rounding,
  compact trigger rows, count pills, and small icon chips. Content should use a
  one-column mobile layout and two-column desktop layout for facts. App access
  rows and authentication providers should be compact bordered rows inside the
  accordion content, with icons at the left and metadata under the primary label.
- **Detail page layout**: overview pages use a two-column desktop layout
  (`30% / 1fr`) with the collapsible fact stack in the left column and a reserved
  insight/activity rail on the right. Mobile collapses to one column.
- **List/section headers** (`.mc-header-row`): a one‑step elevation tint + hairline
  so the top of a table anchors instead of reading as a blank band.
- **Sidebar**: white in light, raised surface in dark; per‑item colored icons
  (blue/green/gold/purple/red) provide the only multi‑color moment — the active
  item uses the green accent pill.

## Extending the system

- Reach for **tokens**, not literals. New surfaces should use `--876-canvas` /
  `--876-surface` / `--card` / `--border` and the `--shadow-876-*` /
  `--876-accent-*` variables so they inherit the ladder automatically.
- Keep new elevation steps **inside** the existing ladder (don't exceed pure
  white in light or out‑step `--876-surface` in dark), and keep dark surfaces
  monotonic on hue ~250.
- If a surface needs more separation, prefer a stronger **hairline or shadow**
  before a bigger lightness jump.
- Tune by eye in both themes with the sidebar collapsed and expanded — the
  target is "cohesive and calm," not "high contrast."

## Scope & boundaries

Everything here lives under Console (`apps/console`). It overrides
shared `@876/ui` tokens locally and must not be promoted into `@876/ui` without
intentionally restyling the consumer app and auth pages too.
